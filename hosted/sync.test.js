import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { blankEntry } from "../shared/model.js";
test("hosted devices share saved entries and reject stale edits", async () => {
  const { default: worker } = await import("../dist/server/index.js");
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync("drizzle/0000_journal.sql", "utf8"));
  const env = {
    DB: {
      prepare: (sql) => ({
        bind: (...args) => {
          const s = db.prepare(sql);
          return {
            first: () => s.get(...args),
            all: () => ({ results: s.all(...args) }),
            run: () => ({ meta: s.run(...args) }),
          };
        },
      }),
    },
  };
  const origin = "https://journal.example";
  const call = (who, path, method = "GET", body) =>
    worker.fetch(
      new Request(origin + "/api/" + path, {
        method,
        headers: {
          "oai-authenticated-user-id": who,
          Origin: origin,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
      env,
    );
  const entry = { ...blankEntry(), title: "Phone test", content: "आज" };
  const phone = await (await call("khush", "journals", "POST", entry)).json();
  assert.equal(
    (await (await call("khush", "journals")).json())[0].id,
    phone.id,
  );
  assert.equal((await call("other", "journals/" + phone.id)).status, 404);
  const edit = {
    ...entry,
    previousVersion: phone.updatedAt,
    title: "Laptop update",
  };
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(
    (await call("khush", "journals/" + phone.id, "PUT", edit)).status,
    200,
  );
  assert.equal(
    (await call("khush", "journals/" + phone.id, "PUT", edit)).status,
    409,
  );
  assert.equal(
    (await (await call("khush", "journals/" + phone.id)).json()).title,
    "Laptop update",
  );
  const habit = await (
    await call("khush", "habits", "POST", {
      name: "Read",
      schedule: [1],
      reminder: "",
    })
  ).json();
  for (const status of ["Done", "Rest"])
    assert.equal(
      (
        await call("khush", "habits/" + habit.id + "/completions", "POST", {
          status,
          date: "2026-11-19",
        })
      ).status,
      200,
    );
  assert.equal(
    (await (await call("khush", "habits/" + habit.id)).json()).completions[0]
      .status,
    "Rest",
  );
  db.close();
});
