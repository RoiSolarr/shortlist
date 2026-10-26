# Architecture notes

Why the system is built this way, what it does not do yet, and what I would change before real users depend on it.

## 1. Technology

* **Supabase (Postgres, Auth, Storage, Row Level Security).** One free service covers the database, sign in, file storage and per user data isolation. Underneath it is plain Postgres, and the schema lives in ordered SQL migrations, so moving away later means changing the Auth integration, not the data model.
* **Next.js with TypeScript.** One codebase for the pages and the small server side API that talks to n8n. Server routes keep secrets off the browser.
* **n8n on Render.** The automation (fetching pages, calling Gemini, extracting PDF text) is a visual workflow that can be changed without redeploying the site. It is self hosted on Render's free plan, with its own data in Supabase.
* **Gemini API.** Free tier, and structured JSON output, so the score and lists come back in a fixed shape.

## 2. Data model

### Schemas: one folder per owner

```
app       resumes 1─* applications *─1 job_postings      (this project)
          applications 1─* application_status_history
n8n       n8n's internal tables                           (n8n only)
storage   resumes bucket                                  (Supabase)
auth      users                                           (Supabase)
public    empty
```

### Tables

| Table | One row is | Key rules |
| --- | --- | --- |
| `app.resumes` | one resume version | many per user, exactly one active (partial unique index) |
| `app.job_postings` | one job post, as read or pasted | one row per user and link (`unique (user_id, source_url)`) |
| `app.applications` | one card on the board | one per posting; latest AI analysis plus tracking fields; status is the enum `app.application_status` |
| `app.application_status_history` | one status change | written only by a trigger |

Every table has `user_id`, `created_at` and `updated_at` (history has `changed_at`). Indexes cover `user_id`, the board query `(user_id, status, board_position)`, `(user_id, created_at)` and `(user_id, analyzed_at)` for the daily limit.

### Decision log

| Option | Why not, or why |
| --- | --- |
| Everything in `public` | Works, but mixes project data with n8n's tables and with whatever Supabase exposes by default. Permissions cannot be revoked per area. |
| **`app` schema for project data (chosen)** | Opens in its own view in the Table Editor, and `anon` can be denied at the schema level. Cost: one Exposed schemas setting and `db: { schema: "app" }` in the Supabase client. |
| One `jobs` table holding posting, analysis and tracking (first version) | Simple, but a re analysis could not be tied to the resume version it used, and duplicate links were only caught in app code. |
| **Posting and application as separate tables (chosen)** | The posting is the job, the application is my progress on it. The link is unique per user in the database. Cost: one join, done by PostgREST embedding. |
| Separate `analyses` table keeping every past analysis | Full history of scores. Rejected for now: more code and joins than a personal tracker needs. Analyzing again overwrites the card. |
| Status as a `check` constraint | Easy to change. Enum chosen instead so generated TypeScript types get the exact five values. Adding a value is one `alter type`; removing one is harder. |
| History written by the website | Could be forgotten or faked from the browser. A trigger writes it instead, as the table owner. |

## 3. Keeping each user's data separate

* **Row Level Security on every table.** Every policy is `to authenticated` and checks `user_id = (select auth.uid())`.
* **`anon` gets nothing:** no usage on schema `app`, so even a table without policies could not be read by a signed out visitor.
* **Column level grants.** On `applications` a user may update only `status`, `notes`, `cover_letter`, `applied_at` and `board_position`. They cannot change their fit score, the AI text fields, or `user_id`.
* **Creation only through n8n.** Users have no insert permission on `job_postings` or `applications`. Those rows come from `app.save_analysis`, which only `service_role` may execute.
* **Composite foreign keys.** `(job_posting_id, user_id)`, `(resume_id, user_id)` and `(application_id, user_id)` reference `(id, user_id)` on the parent. A card can never point at another user's posting or resume, and a history row can never point at another user's card, even if n8n or app code has a bug. This matters because n8n uses the service role, which bypasses RLS.

## 4. How n8n writes data with the right `user_id`

1. The browser calls a Next.js API route. It never sends a `user_id`.
2. The route calls `supabase.auth.getUser()`, which verifies the session with Supabase, and puts that `user.id` in the request to n8n together with the shared secret header.
3. n8n rejects any webhook call without the secret.
4. n8n calls `app.save_analysis(p_user_id => ..., ...)` through the Supabase REST API with the service role key. One function call inserts or updates the posting and the card in one transaction, so nothing is half saved.
5. The function sets `user_id` on every row it writes. If any id it receives belongs to a different user, the composite foreign keys reject the whole call.
6. The website then reads the new card back through RLS before showing it.

## 5. Advantages and limitations

**Advantages:** data isolation is enforced by the database, not by page filters; the schema documents itself through constraints; a status timeline exists for free through the trigger; n8n can be changed without touching the site; everything runs on free tiers.

**Limitations:**

* The n8n webhook trusts the `user_id` it receives once the secret matches. If the secret leaked, someone could write analyses into any account (though never mix two accounts' rows). A signed short lived token per request would be stronger.
* Analyzing again overwrites the previous score and letter, including edits to the letter.
* There are no automated tests for the data isolation. It relies on the policies and constraints in the migrations.
* Free Render instances sleep, so the first request after a pause takes up to a minute.
* Free tier Gemini prompts may be used by Google to improve its products, which is not acceptable for other people's resumes.
* The daily limit counts by the server's day, not the user's time zone.
* Page fetching fails on sites that block bots (LinkedIn, Indeed), so users paste text instead.

## 6. What I would improve for production

1. **Stronger n8n trust:** a short lived signed token from the Next.js server that n8n verifies, instead of only a shared secret.
2. **Keep analysis history** in a separate `analyses` table, and keep user edited letters when analyzing again.
3. **Generated types** from the schema (`supabase gen types`) instead of hand written TypeScript interfaces.
4. **Paid Gemini tier or another model** with a data processing agreement before storing anyone else's resume.
5. **Separate dev and prod Supabase projects**, migrations applied by the CLI, secrets in a vault, point in time recovery.
6. **Rate limiting and abuse protection** beyond the daily count, and email confirmation turned on.
7. **Observability:** error tracking for the site, failed execution alerts in n8n, and uptime checks.
8. **Account deletion and data export** for users.