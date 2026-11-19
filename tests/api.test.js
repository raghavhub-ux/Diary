import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as pause } from "node:timers/promises";
import { blankEntry, day, defaults } from "../shared/model.js";
test("account lifecycle, isolated records, habit history, and consent", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "mindspace-")),
    file = join(dir, "test.db");
  await writeFile(file, "");
  const port = String(31000 + Math.floor(Math.random() * 10000)),
    env = {
      ...process.env,
      DATABASE_URL: "file:" + file,
      PORT: port,
      NODE_ENV: "test",
      APP_ORIGIN: "http://localhost:" + port,
      OPENAI_API_KEY: "",
    };
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env },
  );
  const child = spawn(process.execPath, ["server/index.js"], {
    env,
    stdio: "ignore",
  });
  t.after(async () => {
    const ended = once(child, "exit");
    child.kill();
    await ended;
    await rm(dir, { recursive: true, force: true });
  });
  const call = (path, method = "GET", body, cookie = "") =>
    fetch(env.APP_ORIGIN + "/api/" + path, {
      method,
      headers: { "Content-Type": "application/json", cookie },
      body: method === "GET" ? undefined : JSON.stringify(body || {}),
    });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await call("journals")).status === 401) {
        ready = true;
        break;
      }
    } catch {}
    await pause(50);
  }
  assert.ok(ready);
  const password = "sample pass phrase";
  async function account(name) {
    const res = await call("auth/register", "POST", {
      name,
      email: name + "@test.local",
      password,
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("set-cookie"), /HttpOnly/);
    return res.headers.get("set-cookie").split(";")[0];
  }
  const a = await account("Alice"),
    b = await account("Bob");
  const bodies = {
    journals: {
      ...blankEntry(),
      title: "आज का दिन",
      content: "<p>Learning</p>",
    },
    moods: { mood: "Good", emotions: ["Calm"], date: day() },
    habits: { name: "Read", schedule: [1], reminder: "" },
    goals: {
      title: "Read",
      action: "One page",
      notes: "",
      category: "Reading",
      history: [],
    },
    reviews: {
      period: "Weekly",
      date: day(),
      answers: ["Learned", "", "", "", ""],
    },
  };
  for (const [route, body] of Object.entries(bodies)) {
    const created = await call(route, "POST", body, a);
    assert.equal(created.status, 201);
    const { id } = await created.json();
    const path = route + "/" + id;
    assert.equal((await call(path, "GET", null, b)).status, 404);
    assert.equal((await call(path, "PUT", body, b)).status, 404);
    assert.equal((await call(path, "DELETE", {}, b)).status, 404);
    assert.equal((await call(path, "PUT", body, a)).status, 200);
    if (route === "habits") {
      for (const status of ["Done", "Rest"])
        assert.equal(
          (
            await call(
              path + "/completions",
              "POST",
              { date: day(), status },
              a,
            )
          ).status,
          200,
        );
      assert.equal(
        (await (await call(path, "GET", null, a)).json()).completions.length,
        1,
      );
    }
    assert.equal((await call(path, "DELETE", {}, a)).status, 200);
  }
  assert.equal((await call("journals", "POST", {}, a)).status, 400);
  const consent = { ids: ["example"], task: "Summary", consent: true };
  assert.equal((await call("insights", "POST", consent, a)).status, 403);
  assert.equal(
    (await call("settings", "PUT", { ...defaults, name: "Alice", ai: true }, a))
      .status,
    200,
  );
  assert.equal((await call("insights", "POST", consent, a)).status, 503);
  assert.equal((await call("auth/logout", "POST", {}, b)).status, 200);
  assert.equal((await call("auth/me", "GET", null, b)).status, 401);
  assert.equal(
    (await call("auth/login", "POST", { email: "bob@test.local", password }))
      .status,
    200,
  );
  assert.equal((await call("account", "DELETE", { password }, a)).status, 200);
  assert.equal((await call("auth/me", "GET", null, a)).status, 401);
});
