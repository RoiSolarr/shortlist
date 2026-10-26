import "server-only";

type N8nResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string; code?: string };

/**
 * Calls an n8n webhook with the shared secret header.
 * The secret never reaches the browser because this file is server only.
 */
export async function callN8n<T>(url: string | undefined, body: unknown, timeoutMs = 120_000): Promise<N8nResult<T>> {
  if (!url || !process.env.N8N_WEBHOOK_SECRET) {
    return { ok: false, status: 500, error: "The n8n webhook is not configured. Check the environment variables." };
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": process.env.N8N_WEBHOOK_SECRET,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return {
      ok: false,
      status: 504,
      error: timedOut
        ? "The automation server took too long to answer. It may be waking up. Try again in a minute."
        : "Could not reach the automation server. Check that n8n is running and the workflow is active.",
    };
  }

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  if (!res.ok) {
    if (res.status === 404) {
      return { ok: false, status: 502, error: "The n8n workflow is not active. Open it in n8n and switch it to Active." };
    }
    if (res.status === 403 || res.status === 401) {
      return { ok: false, status: 502, error: "n8n rejected the webhook secret. Make sure both sides use the same value." };
    }
    return {
      ok: false,
      status: res.status === 422 ? 422 : 502,
      error: typeof json.error === "string" ? json.error : "The automation step failed. Try again in a minute.",
      code: typeof json.code === "string" ? json.code : undefined,
    };
  }

  return { ok: true, data: json as T };
}
