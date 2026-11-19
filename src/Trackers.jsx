import React, { useState } from "react";
import { day, daysAgo, questions, categories } from "../shared/model";
import { useJournal, api } from "./store";
import { Answers, Chips, opt, pretty } from "./Journal";
const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function Habits() {
  const { data, change, completion, run, prefs } = useJournal(),
    [date, D] = useState(day()),
    [weekly, W] = useState(false),
    [edit, E] = useState(null),
    [form, F] = useState(null);
  const anchor = new Date(date + "T12:00:00"),
    offset = (anchor.getDay() - (prefs.week === "Monday" ? 1 : 0) + 7) % 7;
  const week = Array.from({ length: 7 }, (_, i) =>
    day(
      new Date(
        anchor.getFullYear(),
        anchor.getMonth(),
        anchor.getDate() - offset + i,
      ),
    ),
  );
  return (
    <>
      <header>
        <h1>Habit tracker</h1>
        <button
          className="primary"
          onClick={() => {
            E(null);
            F({ name: "", schedule: [1, 2, 3, 4, 5], reminder: "" });
          }}
        >
          ＋ Add habit
        </button>
      </header>
      <div className="row">
        <input
          aria-label="Tracking date"
          type="date"
          value={date}
          onChange={(e) => e.target.value && D(e.target.value)}
        />
        <button onClick={() => W(!weekly)}>
          {weekly ? "Daily view" : "Weekly view"}
        </button>
      </div>
      {form && (
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await change("habits", edit ? "PUT" : "POST", form, edit);
              F(null);
            });
          }}
        >
          <label>
            Habit name
            <input
              required
              value={form.name}
              onChange={(e) => F({ ...form, name: e.target.value })}
            />
          </label>
          <Chips
            items={names}
            values={form.schedule.map((i) => names[i])}
            set={(days) =>
              F({ ...form, schedule: days.map((x) => names.indexOf(x)) })
            }
          />
          <label>
            In-app reminder time
            <input
              type="time"
              value={form.reminder}
              onChange={(e) => F({ ...form, reminder: e.target.value })}
            />
          </label>
          <button className="primary">Save habit</button>{" "}
          <button type="button" onClick={() => F(null)}>
            Cancel
          </button>
        </form>
      )}
      {!data.habits.length && (
        <p className="empty">Add a habit you want to make time for.</p>
      )}
      {data.habits.map((h) => (
        <section className="panel" key={h.id}>
          <header>
            <h2>{h.name}</h2>
            <div>
              <button
                onClick={() => {
                  E(h.id);
                  F(h);
                }}
              >
                Edit
              </button>{" "}
              <button
                onClick={() =>
                  run(async () => {
                    if (confirm("Delete this habit and its history?"))
                      await change("habits", "DELETE", null, h.id);
                  })
                }
              >
                Delete
              </button>
            </div>
          </header>
          <small>
            {h.schedule.map((i) => names[i]).join(" · ") || "Flexible schedule"}{" "}
            ·{" "}
            {
              h.completions.filter(
                (c) => week.includes(c.date) && c.status === "Done",
              ).length
            }{" "}
            days completed this week
          </small>
          <div className="filters">
            {(weekly ? week : [date]).map((d) => (
              <label key={d}>
                {pretty(d)}
                <select
                  value={
                    h.completions.find((x) => x.date === d)?.status || "Open"
                  }
                  onChange={(e) => run(() => completion(h, d, e.target.value))}
                >
                  {["Open", "Done", "Rest"].map(opt)}
                </select>
              </label>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
export function Growth() {
  const { data, change, run } = useJournal(),
    [form, F] = useState(null),
    [note, N] = useState({});
  return (
    <>
      <header>
        <h1>My growth</h1>
        <button
          className="primary"
          onClick={() =>
            F({
              category: "Academics",
              title: "",
              action: "",
              notes: "",
              history: [],
            })
          }
        >
          ＋ Add goal
        </button>
      </header>
      {form && (
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await change("goals", form.id ? "PUT" : "POST", form, form.id);
              F(null);
            });
          }}
        >
          {[
            ["category", "Growth category"],
            ["title", "Personal goal"],
            ["action", "Daily action"],
            ["notes", "Notes"],
          ].map(([k, label]) => (
            <label key={k}>
              {label}
              <input
                list={k === "category" ? "areas" : undefined}
                required={["category", "title"].includes(k)}
                value={form[k]}
                onChange={(e) => F({ ...form, [k]: e.target.value })}
              />
            </label>
          ))}
          <datalist id="areas">{categories.map(opt)}</datalist>
          <button className="primary">Save goal</button>{" "}
          <button type="button" onClick={() => F(null)}>
            Cancel
          </button>
        </form>
      )}
      {!data.goals.length && (
        <p className="empty">Choose one area where you want to grow.</p>
      )}
      {data.goals.map((g) => (
        <section className="panel" key={g.id}>
          <small>{g.category}</small>
          <h2>{g.title}</h2>
          <p>{g.action}</p>
          <p>{g.notes}</p>
          <button onClick={() => F(g)}>Edit goal</button>{" "}
          <button
            onClick={() =>
              run(async () => {
                if (confirm("Delete goal and progress history?"))
                  await change("goals", "DELETE", null, g.id);
              })
            }
          >
            Delete
          </button>
          <h3>Progress history</h3>
          {g.history.map((h, i) => (
            <p key={i}>
              {pretty(h.date)} · {h.text}
            </p>
          ))}
          <label>
            Progress note or weekly reflection
            <input
              maxLength={180}
              value={note[g.id] || ""}
              onChange={(e) => N({ ...note, [g.id]: e.target.value })}
            />
          </label>
          <button
            disabled={!note[g.id]?.trim()}
            onClick={() =>
              run(async () => {
                await change(
                  "goals",
                  "PUT",
                  {
                    ...g,
                    history: [...g.history, { date: day(), text: note[g.id] }],
                  },
                  g.id,
                );
                N({ ...note, [g.id]: "" });
              })
            }
          >
            Record progress
          </button>
        </section>
      ))}
    </>
  );
}
export function Reviews() {
  const { data, change, run } = useJournal(),
    fresh = { period: "Weekly", date: day(), answers: Array(5).fill("") },
    [f, F] = useState(fresh);
  return (
    <>
      <h1>Weekly & monthly reviews</h1>
      <section className="panel">
        <div className="row">
          <select
            aria-label="Review period"
            value={f.period}
            onChange={(e) => F({ ...fresh, period: e.target.value })}
          >
            {["Weekly", "Monthly"].map(opt)}
          </select>
          <input
            type="date"
            aria-label="Review date"
            value={f.date}
            onChange={(e) => F({ ...f, date: e.target.value })}
          />
        </div>
        <Answers
          items={questions[f.period]}
          answers={f.answers}
          set={(answers) => F({ ...f, answers })}
        />
        <button
          className="primary"
          disabled={!f.answers.some((x) => x.trim())}
          onClick={() =>
            run(async () => {
              await change("reviews", f.id ? "PUT" : "POST", f, f.id);
              F(fresh);
            })
          }
        >
          Save review
        </button>
      </section>
      <section className="panel">
        <h2>Saved reviews</h2>
        {!data.reviews.length && <p>No reviews yet.</p>}
        {data.reviews.map((r) => (
          <div className="entry" key={r.id}>
            <button onClick={() => F(r)}>
              {r.period} · {pretty(r.date)}
            </button>
            <button
              onClick={() =>
                run(async () => {
                  if (confirm("Delete this review?")) {
                    await change("reviews", "DELETE", null, r.id);
                    if (f.id === r.id) F(fresh);
                  }
                })
              }
            >
              Delete
            </button>
          </div>
        ))}
      </section>
    </>
  );
}
export function Insights() {
  const { data, prefs, user, run } = useJournal(),
    [id, I] = useState(""),
    [task, T] = useState("Summary"),
    [out, O] = useState(""),
    [wait, W] = useState(false);
  const tags = data.journals.flatMap((j) => j.tags).filter(Boolean),
    freq = [...new Set(tags)]
      .map((t) => [t, tags.filter((x) => x === t).length])
      .sort((a, b) => b[1] - a[1]);
  const ids =
    task === "Weekly summary"
      ? data.journals
          .filter((e) => e.date >= daysAgo(6) && e.date <= day())
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 7)
          .map((e) => e.id)
      : [id].filter(Boolean);
  return (
    <>
      <h1>Personal insights</h1>
      <section className="panel">
        <h2>Recurring tags</h2>
        <p>
          {freq.map(([t, n]) => t + " · " + n).join("　") ||
            "Tag a journal entry to see themes over time."}
        </p>
      </section>
      <section className="panel">
        <h2>Reflection companion</h2>
        {!prefs.ai ? (
          <p>
            Optional AI reflections are off. You can enable them in Settings.
          </p>
        ) : user.demo ? (
          <p>Sign in to use the companion with your own entries.</p>
        ) : (
          <>
            <label>
              Reflection type
              <select value={task} onChange={(e) => T(e.target.value)}>
                {[
                  "Summary",
                  "Themes",
                  "Reflection questions",
                  "Observations and assumptions",
                  "Achievements",
                  "Small next steps",
                  "Weekly summary",
                ].map(opt)}
              </select>
            </label>
            {task !== "Weekly summary" && (
              <label>
                Entry
                <select value={id} onChange={(e) => I(e.target.value)}>
                  <option value="">Choose entry</option>
                  {data.journals.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p>
              OpenAI will receive the title and written content of {ids.length}{" "}
              selected {ids.length === 1 ? "entry" : "entries"}.
            </p>
            <ul>
              {data.journals
                .filter((e) => ids.includes(e.id))
                .map((e) => (
                  <li key={e.id}>{e.title}</li>
                ))}
            </ul>
            <button
              disabled={!ids.length || wait}
              onClick={() =>
                run(async () => {
                  if (
                    !confirm(
                      "Share the listed titles and journal text with OpenAI for this analysis?",
                    )
                  )
                    return;
                  W(true);
                  O("");
                  try {
                    O(
                      (
                        await api("insights", "POST", {
                          ids,
                          task,
                          consent: true,
                        })
                      ).text,
                    );
                  } finally {
                    W(false);
                  }
                })
              }
            >
              {wait ? "Reflecting…" : "Share and analyze"}
            </button>
            <p className="pre">{out}</p>
          </>
        )}
      </section>
    </>
  );
}
