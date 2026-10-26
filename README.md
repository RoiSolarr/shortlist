# Shortlist: AI Job Application Assistant

Paste a job post link. n8n reads the page, compares it with your active resume using Gemini, scores your fit from 0 to 100, lists the skills you match and the gaps, drafts a cover letter, and saves everything to Supabase. The site shows every job on a tracker board (Saved, Applied, Interview, Offer, Rejected), with a timeline of when each status changed.

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind CSS 4), Supabase (Postgres, Auth, Storage, Row Level Security), n8n (self hosted on Render), Google Gemini API, dnd kit for drag and drop.

Design decisions, limitations and production plans are in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## How it works

```
 Browser (Next.js pages)
   │  paste link / upload PDF / drag cards
   ▼
 Next.js API routes  ── checks login, active resume, daily limit, repeated link
   │  POST + x-webhook-secret header, user_id taken from the verified session
   ▼
 n8n on Render
   ├─ analyze-job:     fetch page → clean text → app.get_active_resume → Gemini → app.save_analysis
   └─ process-resume:  download PDF (signed URL) → extract text → app.save_resume_text
   │  service_role key, only inside n8n
   ▼
 Supabase
   ├─ app      resumes, job_postings, applications, application_status_history
   ├─ n8n      n8n's own tables
   ├─ storage  private "resumes" bucket
   └─ auth     user accounts
   ▲
   └── the board reads and updates "app" directly, limited by Row Level Security
```

## Project structure

```
job-application-assistant/
├── README.md
├── ARCHITECTURE.md
├── render.yaml                              Render Blueprint (n8n + website)
├── supabase/
│   ├── migrations/
│   │   ├── 0001_schema_and_grants.sql       app schema, base permissions
│   │   ├── 0002_tables.sql                  tables, constraints, indexes, timestamps
│   │   ├── 0003_rls.sql                     Row Level Security and column grants
│   │   ├── 0004_status_history.sql          history table and trigger
│   │   ├── 0005_functions.sql               functions n8n and the site call
│   │   └── 0006_storage.sql                 resume bucket and folder policies
│   └── seed.sql                             two fictional demo users with data
├── n8n/
│   ├── analyze-job.workflow.json
│   └── process-resume.workflow.json
└── web/                                     Next.js app
    ├── .env.example
    └── src/
        ├── proxy.ts                         session refresh + route protection
        ├── app/
        │   ├── login/  auth/callback/
        │   ├── (app)/page.tsx               Analyze (home)
        │   ├── (app)/board/                 tracker board
        │   ├── (app)/jobs/[id]/             report, cover letter, notes, timeline
        │   ├── (app)/resume/                resume versions
        │   └── api/analyze/  api/resume/process/
        ├── components/
        └── lib/                             Supabase clients, mappers, types, n8n caller
```

---

## Setup

### Step 1. Supabase project

1. Create a free project at [supabase.com](https://supabase.com) and save the database password.
2. **Authentication > URL Configuration**:
   * Site URL: `http://localhost:3000` for now (your Render URL later).
   * Redirect URLs: add `http://localhost:3000/auth/callback`, and later `https://YOUR-SITE.onrender.com/auth/callback`.
3. Optional while testing: **Authentication > Providers > Email**, turn off **Confirm email**.
4. Collect these values:
   * **Project URL** and **anon key** (Project Settings > API Keys). The website uses these.
   * **service_role key** (legacy keys tab). Only n8n gets this key.
   * **Session pooler** connection (the **Connect** button): host, port `5432`, user `postgres.YOUR-PROJECT-REF`. n8n uses this.

### Step 2. Database: migrations and demo data

Open **SQL Editor > New query**. Paste each file, click **Run**, and wait for success before the next one:

| Order | File | What it does |
| --- | --- | --- |
| 1 | `supabase/migrations/0001_schema_and_grants.sql` | Creates the `app` and `n8n` schemas, removes the first version's `public.jobs` and `public.resumes` |
| 2 | `supabase/migrations/0002_tables.sql` | Tables, constraints, indexes, `updated_at` triggers |
| 3 | `supabase/migrations/0003_rls.sql` | Row Level Security and permissions |
| 4 | `supabase/migrations/0004_status_history.sql` | Status history table and its trigger |
| 5 | `supabase/migrations/0005_functions.sql` | Functions for n8n and the website |
| 6 | `supabase/migrations/0006_storage.sql` | Private `resumes` bucket and its policies |
| 7 | `supabase/seed.sql` | Two demo users with fictional data (optional) |

**Expose the `app` schema to the API.** In Supabase, open the Data API settings (Project Settings > Data API, or Integrations > Data API in newer dashboards) and add `app` to **Exposed schemas**. Without this the website gets "schema must be one of the following" errors.

Demo logins created by the seed (fictional, password `DemoPass123!`): `ana.demo@example.com` and `ben.demo@example.com`. Delete them before you share the site publicly:

```sql
delete from auth.users where email in ('ana.demo@example.com', 'ben.demo@example.com');
```

### Step 3. Gemini API key

Create a key at [Google AI Studio](https://aistudio.google.com/apikey). The workflow uses `gemini-2.5-flash`. If Google renames the model, change the `MODEL` line in the **Build Gemini Request** node.

On the free tier Google may use prompts to improve its products, so treat this as a personal project.

### Step 4. n8n on Render

Deploy the `docker.io/n8nio/n8n:latest` image on Render's free plan (or use the Blueprint in `render.yaml`) with these environment variables:

| Variable | Value |
| --- | --- |
| `PORT`, `N8N_PORT` | `5678` |
| `N8N_PROTOCOL` | `https` |
| `N8N_ENCRYPTION_KEY` | long random text. Never change it later |
| `WEBHOOK_URL`, `N8N_EDITOR_BASE_URL` | `https://YOUR-N8N.onrender.com/` |
| `GENERIC_TIMEZONE` | `Asia/Manila` |
| `DB_TYPE` | `postgresdb` |
| `DB_POSTGRESDB_HOST` | session pooler host |
| `DB_POSTGRESDB_PORT` | `5432` |
| `DB_POSTGRESDB_DATABASE` | `postgres` |
| `DB_POSTGRESDB_USER` | `postgres.YOUR-PROJECT-REF` |
| `DB_POSTGRESDB_PASSWORD` | database password |
| `DB_POSTGRESDB_SCHEMA` | `n8n` |
| `DB_POSTGRESDB_SSL_ENABLED` | `true` |
| `DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED` | `false` |

`DB_POSTGRESDB_SCHEMA=n8n` keeps n8n's tables out of the `app` and `public` schemas.

### Step 5. Connect n8n

1. Make a shared secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. In n8n, create three credentials:

   | Type | Fields |
   | --- | --- |
   | **Header Auth** | Name `x-webhook-secret`, Value: the secret |
   | **Supabase API** | Host: Project URL, Service Role Secret: the `service_role` key |
   | **Google Gemini(PaLM) Api** | API Key from AI Studio |

3. Import the two files in the `n8n` folder (Create workflow > ... > Import from file).
4. In **each** workflow, open the **Config** node and replace `https://YOUR-PROJECT-REF.supabase.co` with your Project URL.
5. Select credentials on these nodes:
   * analyze-job: **Webhook** (Header Auth), **Get Active Resume** and **Save Analysis** (Supabase API), **Gemini: Score and Draft** (Gemini)
   * process-resume: **Webhook** (Header Auth), **Save Resume Text** (Supabase API)
6. Save both, switch them to **Active**, and copy each Webhook node's **Production URL**.

### Step 6. Run the website

```powershell
cd web
copy .env.example .env.local     # macOS / Linux: cp .env.example .env.local
npm install
npm run dev
```

Fill in `.env.local` (see the comments inside), then open http://localhost:3000. Sign in as a demo user to see a filled board, or create your own account and add your resume on the **Resume** page. Node.js 20.9 or newer is required.

### Step 7. Deploy the website

Render **New > Web Service** from your repo: root directory `web`, build `npm ci && npm run build`, start `npm start`, Free plan, the same variables as `.env.local` plus `NODE_VERSION=22`. Then add the site URL and its `/auth/callback` to Supabase's URL Configuration.

### Step 8. Keep n8n awake (optional)

Free Render services sleep after about 15 minutes. A free monitor on [UptimeRobot](https://uptimerobot.com) or [cron-job.org](https://cron-job.org) calling `https://YOUR-N8N.onrender.com/healthz` every 10 minutes avoids the 30 to 60 second wake up. Render's roughly 750 free hours a month cover one always awake service, so keep only n8n awake.

---

## Security notes

* The `service_role` key exists only in n8n's Supabase API credential. It is never in the website, `.env.example`, or the repo.
* The browser never sends `user_id` to n8n. The Next.js server reads it from the verified session and adds the webhook secret.
* Signed in users cannot insert job postings or applications at all. Those rows are created only by `app.save_analysis`, which only `service_role` may execute.
* Resume PDFs sit in a private bucket. n8n gets a signed link that expires after 5 minutes.
* `DAILY_ANALYSIS_LIMIT` caps analyses per user per day to protect your Gemini quota.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Website error mentioning "schema must be one of the following" | Add `app` to Exposed schemas (step 2). |
| "The n8n workflow is not active" | Activate it, and use the Production URL, not the Test URL. |
| "n8n rejected the webhook secret" | `N8N_WEBHOOK_SECRET` must match the Header Auth value exactly. |
| Save Analysis or Get Active Resume returns 401 | Use the legacy `service_role` JWT key in the Supabase API credential. |
| Supabase API is not listed in the HTTP Request credential dropdown | Choose Generic credential type > Custom Auth, with `{"headers":{"apikey":"KEY","Authorization":"Bearer KEY"}}` using the service_role key. |
| Save Analysis returns 404 | Check the Config node URL, and that migration 0005 ran. |
| "This job page could not be read automatically" | The site blocks bots (LinkedIn, Indeed). Use **Paste description**. |
| A minute of waiting, then it works | n8n was asleep. See step 8. |
| Gemini 429 or 404 | Rate limit (wait a minute) or renamed model (update `MODEL`). |

---

## Development process and tools

**Tools**

* **Claude (Anthropic), in claude.ai:** proposed the schema with its tradeoffs, which I reviewed and approved with my own choices (resume versions, analyzing again overwrites the card, five statuses, migrations pasted into the SQL Editor). It then wrote the migrations, seed, Next.js code, n8n workflow files and these docs.
* **Gemini API:** used inside the product to score fit and draft cover letters.
* **Supabase dashboard, n8n, Render, VS Code with PowerShell on Windows:** for hosting, configuration and running the app.

If another AI assistant is used later, it is added here with what it was used for.

**How outputs were verified, and what is still open**

| Check | Where it ran | Result |
| --- | --- | --- |
| All 6 migrations apply in order | Local PostgreSQL 16 with Supabase's `anon`, `authenticated`, `service_role` roles, `auth.uid()` and storage tables stubbed | Passed |
| `seed.sql` runs, and runs again without errors | Same local database | Passed |
| `save_analysis`, `save_resume_text`, `get_active_resume` normal paths (new link, pasted text, same link again keeps status and notes, analyze again by posting id) | Same, as `service_role` | Passed |
| n8n Code node logic | Node.js with mock Gemini output, writing to the local database through `app.save_analysis` | Passed |
| TypeScript check and `next build` | Local | Passed |
| Migrations and seed on the hosted Supabase project | Supabase SQL Editor | **Not run yet** |
| Website against real Supabase Auth and the Data API | Browser | **Not run yet** |
| Workflows inside a live n8n with real Gemini calls | n8n on Render | **Not run yet** |

The local database only imitates Supabase, so hosted results are what count. Update the last three rows after running them.