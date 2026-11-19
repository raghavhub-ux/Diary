import { z } from "zod";
import { defaults, preferences, schemas } from "../shared/model";
import assets from "mindspace-assets";
const json = (value, status = 200) =>
  Response.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
const fail = (message, status) => json({ error: message }, status);
const hydrate = (row) => ({
  ...JSON.parse(row.body),
  id: row.id,
  createdAt: row.created,
  updatedAt: row.updated,
});
export async function handle(request, env) {
  const url = new URL(request.url),
    path = url.pathname;
  if (!path.startsWith("/api/")) {
    const asset =
      assets[path] || (!path.includes(".") ? assets["/index.html"] : null);
    return asset
      ? new Response(asset.body, {
          headers: {
            "Content-Type": asset.type,
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "same-origin",
            "Content-Security-Policy":
              "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'",
          },
        })
      : new Response("Not found", { status: 404 });
  }
  const owner = request.headers.get("oai-authenticated-user-id");
  if (!owner) return fail("Sign in to access your journal.", 401);
  const method = request.method;
  if (
    method !== "GET" &&
    (request.headers.get("Origin") !== url.origin ||
      !request.headers.get("Content-Type")?.startsWith("application/json"))
  )
    return fail("Request origin rejected.", 403);
  const q = (sql, ...params) => env.DB.prepare(sql).bind(...params);
  const [, , kind, id, action] = path.split("/");
  const body = method === "GET" ? {} : await request.json();
  const now = new Date().toISOString();
  const setting = async () =>
    JSON.parse(
      (
        await q(
          "SELECT body FROM records WHERE owner=? AND kind='settings' AND id='self'",
          owner,
        ).first()
      )?.body || "{}",
    );
  if (path === "/api/auth/me" && method === "GET") {
    const s = await setting();
    const email = request.headers.get("oai-authenticated-user-email") || "";
    return json({
      id: owner,
      email,
      name: s.name || email.split("@")[0] || "Friend",
      hosted: true,
    });
  }
  if (path === "/api/auth/logout" && method === "POST")
    return json({ ok: true });
  if (path === "/api/account" && method === "DELETE") {
    if (body.confirmation !== "DELETE")
      return fail("Type DELETE to confirm.", 400);
    await q("DELETE FROM records WHERE owner=?", owner).run();
    return json({ ok: true });
  }
  if (path === "/api/settings") {
    if (method === "GET") {
      const { name, ...s } = await setting();
      return json({ ...defaults, ...s });
    }
    if (method === "PUT") {
      const s = preferences.parse(body),
        name = z.string().trim().min(1).max(80).parse(body.name);
      await q(
        "INSERT INTO records VALUES(?,'settings','self',?,?,?) ON CONFLICT(owner,kind,id) DO UPDATE SET body=excluded.body,updated=excluded.updated",
        owner,
        JSON.stringify({ ...s, name }),
        now,
        now,
      ).run();
      return json(s);
    }
  }
  if (kind === "insights")
    return fail(
      "The optional AI provider is offline. Your entries have not been shared.",
      503,
    );
  if (!Object.hasOwn(schemas, kind)) return fail("Unknown endpoint.", 404);
  if (action === "completions" && kind === "habits" && method === "POST") {
    const { date, status } = z
      .object({
        date: z.string().date(),
        status: z.enum(["Done", "Rest", "Open"]),
      })
      .parse(body);
    const result = await q(
      "UPDATE records SET body=json_set(body,'$.completions',json((SELECT json_group_array(json(value)) FROM (SELECT value FROM json_each(records.body,'$.completions') WHERE json_extract(value,'$.date')<>? UNION ALL SELECT json_object('date',?,'status',?))))), updated=? WHERE owner=? AND kind=? AND id=?",
      date,
      date,
      status,
      now,
      owner,
      kind,
      id,
    ).run();
    return result.meta.changes
      ? json({ ok: true })
      : fail("Habit unavailable.", 404);
  }
  if (action) return fail("Unknown endpoint.", 404);
  const one = () =>
    q(
      "SELECT * FROM records WHERE owner=? AND kind=? AND id=?",
      owner,
      kind,
      id,
    ).first();
  if (method === "GET") {
    if (id) {
      const row = await one();
      return row ? json(hydrate(row)) : fail("Record unavailable.", 404);
    }
    const rows = await q(
      "SELECT * FROM records WHERE owner=? AND kind=? ORDER BY created DESC",
      owner,
      kind,
    ).all();
    return json(rows.results.map(hydrate));
  }
  if (method === "DELETE" && id) {
    const result = await q(
      "DELETE FROM records WHERE owner=? AND kind=? AND id=?",
      owner,
      kind,
      id,
    ).run();
    return result.meta.changes
      ? json({ ok: true })
      : fail("Record unavailable.", 404);
  }
  if (method === "POST" && !id) {
    const value = schemas[kind].parse(body),
      key = crypto.randomUUID();
    if (kind === "habits") value.completions = [];
    await q(
      "INSERT INTO records VALUES(?,?,?,?,?,?)",
      owner,
      kind,
      key,
      JSON.stringify(value),
      now,
      now,
    ).run();
    return json({ ...value, id: key, createdAt: now, updatedAt: now }, 201);
  }
  if (method === "PUT" && id) {
    const value = schemas[kind].parse(body),
      row = await one();
    if (!row) return fail("Record unavailable.", 404);
    if (kind === "habits") value.completions = hydrate(row).completions;
    const result = await q(
      "UPDATE records SET body=?,updated=? WHERE owner=? AND kind=? AND id=? AND updated=?",
      JSON.stringify(value),
      now,
      owner,
      kind,
      id,
      body.previousVersion || row.updated,
    ).run();
    return result.meta.changes
      ? json({ ...value, id, createdAt: row.created, updatedAt: now })
      : fail(
          "This changed on another device. Your draft is still in this tab. Copy your changes and reopen the latest version.",
          409,
        );
  }
  return fail("Unsupported operation.", 405);
}
export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (e) {
      return fail(
        e instanceof z.ZodError
          ? "Check the values and their lengths."
          : "Unable to complete the request.",
        e instanceof z.ZodError ? 400 : 500,
      );
    }
  },
};
