import React, { useState } from "react";
import { api, useJournal, plain, clean } from "./store";
import { schemas, day } from "../shared/model";
import { opt } from "./Journal";
export function Settings() {
  const { data, user, prefs, settings, change, run, leave } = useJournal(),
    [f, F] = useState(prefs),
    [name, N] = useState(user.name),
    [msg, S] = useState(""),
    [printing, P] = useState(false);
  function download() {
    const format = f.export;
    if (format === "PDF") {
      P(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          window.print();
          P(false);
        }),
      );
      return;
    }
    const content =
      format === "JSON"
        ? JSON.stringify({ version: 1, entries: data.journals }, null, 2)
        : data.journals
            .map((e) =>
              [
                e.date,
                e.title,
                e.mood,
                e.tags.join(", "),
                plain(e.content),
              ].join("\n"),
            )
            .join("\n\n─────\n\n");
    const url = URL.createObjectURL(
      new Blob([content], {
        type:
          format === "JSON" ? "application/json" : "text/plain;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "mindspace-" + day() + "." + format.toLowerCase();
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <h1>Settings</h1>
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await settings(f, name);
            S("Preferences saved.");
          });
        }}
      >
        <h2>Your space</h2>
        <label>
          Display name
          <input
            required
            maxLength={80}
            value={name}
            onChange={(e) => N(e.target.value)}
          />
        </label>
        <div className="filters">
          {[
            ["theme", "Theme", ["Light", "Dark"]],
            ["accent", "Accent", ["Sage", "Lavender", "Clay"]],
            ["font", "Writing font", ["Serif", "Sans"]],
            ["size", "Font size", ["16", "18", "22"]],
            ["mode", "Writing mode", ["Free", "Guided"]],
            ["week", "Week starts on", ["Monday", "Sunday"]],
            ["export", "Export format", ["JSON", "TXT", "PDF"]],
          ].map(([k, label, choices]) => (
            <label key={k}>
              {label}
              <select
                value={f[k]}
                onChange={(e) => F({ ...f, [k]: e.target.value })}
              >
                {choices.map(opt)}
              </select>
            </label>
          ))}
        </div>
        {[
          ["reminders", "Show scheduled habit reminders while the app is open"],
          ["lock", "Sign out after 10 minutes of inactivity"],
          ["ai", "Enable optional AI reflection requests"],
        ].map(([k, label]) => (
          <label className="check" key={k}>
            <input
              type="checkbox"
              checked={f[k]}
              onChange={(e) => F({ ...f, [k]: e.target.checked })}
            />
            {label}
          </label>
        ))}
        <button className="primary">Save preferences</button>
      </form>
      <section className="panel">
        <h2>Journal data</h2>
        <button onClick={download}>Export {f.export}</button>
        <label>
          Import MindSpace JSON
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              const file = e.target.files[0];
              e.target.value = "";
              if (file)
                run(async () => {
                  const bundle = JSON.parse(await file.text());
                  if (bundle.version !== 1 || !Array.isArray(bundle.entries))
                    throw Error("Choose a MindSpace JSON export.");
                  const entries = bundle.entries.map((row) =>
                    schemas.journals.parse(row),
                  );
                  const key = (e) =>
                    JSON.stringify([
                      e.date,
                      e.title,
                      clean(e.content),
                      e.image,
                    ]);
                  const seen = new Set(data.journals.map(key));
                  let n = 0;
                  for (const row of entries) {
                    if (!seen.has(key(row))) {
                      await change("journals", "POST", {
                        ...row,
                        content: clean(row.content),
                      });
                      seen.add(key(row));
                      n++;
                    }
                  }
                  S("Imported " + n + " entries.");
                });
            }}
          />
        </label>
      </section>
      <p role="status">{msg}</p>
      {!user.demo && (
        <section className="panel">
          <h2>Delete account</h2>
          <button
            onClick={() =>
              run(async () => {
                if (
                  !confirm(
                    "Permanently delete this account and every journal record?",
                  )
                )
                  return;
                const password = prompt("Enter your password to confirm");
                if (password) {
                  await api("account", "DELETE", { password });
                  await leave(true);
                }
              })
            }
          >
            Delete my account
          </button>
        </section>
      )}
      {printing && (
        <div className="printout">
          <h1>My journal</h1>
          {data.journals.map((e) => (
            <article key={e.id}>
              <h2>{e.title}</h2>
              <small>
                {e.date} · {e.mood} · {e.tags.join(", ")}
              </small>
              <div dangerouslySetInnerHTML={{ __html: clean(e.content) }} />
              {e.image && <img src={e.image} alt="Journal attachment" />}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
