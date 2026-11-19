import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  BookOpen,
  Flame,
  Leaf,
  Sun,
  ArrowUpRight,
  Feather,
} from "lucide-react";
import { day, daysAgo, moods, emotions } from "../shared/model";
import { useJournal } from "./store";
import { EntryList, Chips, opt, pretty } from "./Journal";
export const prompts = [
  "What tiny detail would you like to remember from today?",
  "When did you feel most like yourself today?",
  "What felt easier than it did a week ago?",
  "Who made an ordinary moment feel special?",
  "What did you give yourself time for?",
  "Which small decision helped you today?",
  "What are you curious enough to try again?",
];
const score = (m) => moods.length - moods.indexOf(m);
function history(data) {
  return [...data.journals, ...data.moods]
    .filter((x) => x.mood)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}
function Chart({ count = 7 }) {
  const { data } = useJournal(),
    hist = history(data);
  const points = Array.from({ length: count }, (_, i) => {
    const date = daysAgo(count - 1 - i),
      mood = hist.find((x) => x.date === date)?.mood;
    return {
      date,
      label: new Date(date + "T12:00:00").toLocaleDateString(
        undefined,
        count === 7 ? { weekday: "short" } : { day: "numeric" },
      ),
      score: mood ? score(mood) : null,
    };
  });
  return (
    <div className="chart" aria-label={"Mood history over " + count + " days"}>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={points}
          margin={{ left: 8, right: 12, top: 12, bottom: 2 }}
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 5"
            stroke="var(--border)"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            fontSize={11}
          />
          <YAxis hide domain={[1, 5]} />
          <Tooltip
            labelFormatter={(_, p) => p?.[0]?.payload.date}
            formatter={(v) => [moods[5 - v], "Mood"]}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--accent)"
            fill="var(--tint)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--accent)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {!points.some((p) => p.score) && (
        <small>Your first mood check-in will appear here.</small>
      )}
    </div>
  );
}
export function Dashboard() {
  const { user, data } = useJournal(),
    today = day(),
    hour = new Date().getHours(),
    hist = history(data),
    dates = new Set(data.journals.map((x) => x.date));
  let start = dates.has(today) ? 0 : 1,
    streak = 0;
  while (dates.has(daysAgo(start + streak))) streak++;
  const recent = [...data.journals]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, 5);
  return (
    <>
      <div className="dateline">
        {new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </div>
      <header>
        <h1>
          Good {hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"},{" "}
          {user.name.split(" ")[0]}.
        </h1>
        <Link className="primary" to="/journal/new">
          <Feather size={16} /> Write an entry
        </Link>
      </header>
      <section className="reflection">
        <div>
          <small>DAILY REFLECTION</small>
          <h2>{prompts[new Date().getDay()]}</h2>
          <Link to="/journal/new">
            Write about this <ArrowUpRight size={16} />
          </Link>
        </div>
        <div aria-hidden="true" className="sunrise">
          <i />
          <b />
          <em />
        </div>
      </section>
      <div className="stats">
        {[
          [
            Sun,
            "Today's mood",
            hist.find((x) => x.date === today)?.mood || "Unlogged",
            "/moods",
          ],
          [Flame, "Writing streak", streak + " days", "/journal"],
          [BookOpen, "Journal entries", data.journals.length, "/journal"],
          [
            Leaf,
            "Habits today",
            data.habits.filter((h) =>
              h.completions.some(
                (c) => c.date === today && c.status === "Done",
              ),
            ).length + " done",
            "/habits",
          ],
        ].map(([Icon, label, value, path]) => (
          <Link to={path} key={label}>
            <Icon size={18} />
            <small>{label}</small>
            <strong>{value}</strong>
          </Link>
        ))}
      </div>
      <div className="columns">
        <section className="panel">
          <header>
            <h2>Recent entries</h2>
            <Link to="/journal">View all ↗</Link>
          </header>
          <EntryList entries={recent} />
        </section>
        <div>
          <section className="panel">
            <h2>Weekly mood</h2>
            <Chart />
          </section>
          <section className="panel">
            <header>
              <h2>Current goals</h2>
              <Link to="/growth">Open ↗</Link>
            </header>
            {data.goals.length ? (
              data.goals.map((g) => <p key={g.id}>{g.title}</p>)
            ) : (
              <p className="empty">Give a small intention a home.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
export function Calendar({ heat = false }) {
  const { data, prefs } = useJournal(),
    [month, M] = useState(day().slice(0, 7)),
    [selected, S] = useState(day()),
    [category, C] = useState("");
  const first = new Date(month + "-01T12:00:00"),
    year = first.getFullYear(),
    m = first.getMonth(),
    offset = prefs.week === "Monday" ? 1 : 0;
  const entries = data.journals.filter(
      (x) => !category || x.category === category,
    ),
    hist = history(data);
  function shift(n) {
    M(day(new Date(year, m + n, 1)).slice(0, 7));
  }
  return (
    <section className="panel">
      {!heat && <h1>Journal calendar</h1>}
      <header>
        <h2>
          {first.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <div className="row">
          <button aria-label="Previous month" onClick={() => shift(-1)}>
            ‹
          </button>
          <input
            aria-label="Jump to month"
            type="month"
            value={month}
            onChange={(e) => e.target.value && M(e.target.value)}
          />
          <button aria-label="Next month" onClick={() => shift(1)}>
            ›
          </button>
        </div>
      </header>
      {!heat && (
        <label>
          Category
          <select value={category} onChange={(e) => C(e.target.value)}>
            <option value="">All categories</option>
            {[
              ...new Set(data.journals.map((x) => x.category).filter(Boolean)),
            ].map(opt)}
          </select>
        </label>
      )}
      <div className="calendar">
        {Array.from({ length: 7 }, (_, i) => (
          <small key={i}>
            {
              ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                (i + offset) % 7
              ]
            }
          </small>
        ))}
        {Array.from({ length: (first.getDay() - offset + 7) % 7 }, (_, i) => (
          <span key={"pad" + i} />
        ))}
        {Array.from({ length: new Date(year, m + 1, 0).getDate() }, (_, i) => {
          const d = day(new Date(year, m, i + 1)),
            has = entries.some((x) => x.date === d),
            mood = (heat ? hist : entries).find((x) => x.date === d)?.mood;
          return (
            <button
              key={d}
              aria-pressed={selected === d}
              title={d + " " + (mood || "")}
              onClick={() => S(d)}
              style={
                heat && mood
                  ? {
                      background:
                        "color-mix(in srgb,var(--accent) " +
                        (12 + score(mood) * 9) +
                        "%,var(--surface))",
                    }
                  : {}
              }
            >
              {i + 1}
              {(has || mood) && <small>{mood || "•"}</small>}
            </button>
          );
        })}
      </div>
      <header>
        <h3>{pretty(selected)}</h3>
        <Link to={"/journal/new?date=" + selected}>＋ Add entry</Link>
      </header>
      {heat && (
        <p>
          {hist
            .filter((x) => x.date === selected)
            .map((x) => [x.mood, ...x.emotions].join(" · "))
            .join(" / ") || "No mood recorded"}
        </p>
      )}
      <EntryList entries={entries.filter((x) => x.date === selected)} />
    </section>
  );
}
export function Mood() {
  const { data, change, run } = useJournal(),
    [mood, M] = useState("Good"),
    [feel, F] = useState([]),
    [date, D] = useState(day()),
    [range, R] = useState(7),
    [msg, T] = useState(""),
    hist = history(data);
  return (
    <>
      <h1>Mood tracker</h1>
      <section className="panel">
        <h2>How are you feeling?</h2>
        <div className="row">
          <input
            aria-label="Check-in date"
            type="date"
            value={date}
            onChange={(e) => D(e.target.value)}
          />
          <select
            aria-label="Mood"
            value={mood}
            onChange={(e) => M(e.target.value)}
          >
            {moods.map(opt)}
          </select>
        </div>
        <Chips items={emotions} values={feel} set={F} />
        <button
          className="primary"
          onClick={() =>
            run(async () => {
              await change("moods", "POST", { mood, date, emotions: feel });
              T("Check-in saved");
              F([]);
            })
          }
        >
          Save check-in
        </button>{" "}
        <small role="status">{msg}</small>
      </section>
      <section className="panel">
        <header>
          <h2>Mood history</h2>
          <select
            aria-label="Chart period"
            value={range}
            onChange={(e) => R(Number(e.target.value))}
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
          </select>
        </header>
        <Chart count={range} />
        <h3>Mood distribution</h3>
        <p>
          {moods
            .map((m) => m + " · " + hist.filter((x) => x.mood === m).length)
            .join("　")}
        </p>
        <h3>Emotion frequency</h3>
        <p>
          {emotions
            .filter((e) => hist.some((x) => x.emotions.includes(e)))
            .map(
              (e) =>
                e + " · " + hist.filter((x) => x.emotions.includes(e)).length,
            )
            .join("　") || "No emotions recorded yet."}
        </p>
      </section>
      <Calendar heat />
    </>
  );
}
