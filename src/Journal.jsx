import React, { useState, useRef, useEffect } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
  Link,
} from "react-router-dom";
import {
  Bold,
  Italic,
  List,
  Heading2,
  Maximize,
  ImagePlus,
  ArrowLeft,
  Search,
} from "lucide-react";
import {
  blankEntry,
  day,
  moods,
  emotions,
  questions,
  categories,
} from "../shared/model";
import { clean, plain, useJournal } from "./store";
export const pretty = (d) =>
  new Date(d + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
export function Answers({ items, answers, set }) {
  return items.map((q, i) => (
    <details key={q} className="question">
      <summary>{q}</summary>
      <textarea
        aria-label={q}
        value={answers[i] || ""}
        onChange={(e) =>
          set(
            items.map((_, j) => (i === j ? e.target.value : answers[j] || "")),
          )
        }
      />
    </details>
  ));
}
export function Chips({ items, values, set }) {
  return (
    <div className="chips">
      {items.map((x) => (
        <button
          type="button"
          key={x}
          aria-pressed={values.includes(x)}
          onClick={() =>
            set(
              values.includes(x)
                ? values.filter((y) => y !== x)
                : [...values, x],
            )
          }
        >
          {x}
        </button>
      ))}
    </div>
  );
}
export function EntryList({ entries }) {
  return entries.length ? (
    entries.map((e) => (
      <Link className="entry" to={"/journal/" + e.id} key={e.id}>
        <div>
          <small>
            {pretty(e.date)} · {e.mood || "Unlogged mood"}
          </small>
          <h3>{e.title}</h3>
          <p>{plain(e.content).slice(0, 125)}</p>
        </div>
        <span aria-hidden="true">↗</span>
      </Link>
    ))
  ) : (
    <p className="empty">No entries here yet.</p>
  );
}
export function Timeline() {
  const { data } = useJournal(),
    [f, S] = useState({
      q: "",
      tag: "",
      mood: "",
      from: "",
      to: "",
      sort: "Newest",
    });
  const field = (k) => ({
    value: f[k],
    onChange: (e) => S({ ...f, [k]: e.target.value }),
  });
  const entries = data.journals
    .filter(
      (x) =>
        (x.title + " " + plain(x.content))
          .toLowerCase()
          .includes(f.q.toLowerCase()) &&
        (!f.tag ||
          x.tags.some((t) => t.toLowerCase().includes(f.tag.toLowerCase()))) &&
        (!f.mood || x.mood === f.mood) &&
        (!f.from || x.date >= f.from) &&
        (!f.to || x.date <= f.to),
    )
    .sort(
      (a, b) =>
        (f.sort === "Newest" ? -1 : 1) *
        (a.date.localeCompare(b.date) ||
          a.createdAt.localeCompare(b.createdAt)),
    );
  return (
    <>
      <header>
        <h1>My journal</h1>
        <Link className="primary" to="/journal/new">
          ＋ New entry
        </Link>
      </header>
      <div className="panel filters">
        <label>
          <Search size={16} /> Search
          <input placeholder="Title or journal text" {...field("q")} />
        </label>
        <label>
          Tag
          <input {...field("tag")} />
        </label>
        <label>
          Mood
          <select {...field("mood")}>
            <option value="">All moods</option>
            {moods.map(opt)}
          </select>
        </label>
        {["from", "to"].map((k) => (
          <label key={k}>
            {k}
            <input type="date" {...field(k)} />
          </label>
        ))}
        <label>
          Order
          <select {...field("sort")}>{["Newest", "Oldest"].map(opt)}</select>
        </label>
      </div>
      <section className="panel">
        <EntryList entries={entries} />
      </section>
    </>
  );
}
export const opt = (x) => <option key={x}>{x}</option>;
export function Editor() {
  const { id } = useParams(),
    [query] = useSearchParams(),
    nav = useNavigate(),
    { data, user, prefs, run, change, report } = useJournal();
  const existing = data.journals.find((e) => e.id === id),
    draftKey =
      "ms-draft:" + user.id + ":" + id + ":" + (query.get("date") || "");
  const [draft] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(draftKey));
    } catch {
      return null;
    }
  });
  const [e, S] = useState(
      draft?.entry || existing || blankEntry(query.get("date") || day()),
    ),
    [answers, A] = useState(draft?.answers || []),
    [mode, M] = useState(draft?.mode || prefs.mode),
    [focus, F] = useState(false),
    [status, T] = useState(""),
    [pending, P] = useState(false);
  const area = useRef(null),
    start = useRef(Date.now()),
    initial = useRef(e.duration),
    initialHTML = useRef(e.content),
    [seconds, clock] = useState(0);
  const patch = (k, v) => S((prev) => ({ ...prev, [k]: v }));
  useEffect(() => {
    if (area.current) area.current.innerHTML = clean(initialHTML.current);
    const timer = setInterval(
      () => clock(Math.floor((Date.now() - start.current) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          entry: {
            ...e,
            duration:
              initial.current + Math.floor((Date.now() - start.current) / 1000),
          },
          answers,
          mode,
        }),
      );
      T("Draft saved in this tab");
    } catch {
      T("Draft storage full. Save your entry now.");
    }
  }, [e, answers, mode, draftKey]);
  if (id !== "new" && !existing)
    return (
      <p>
        Entry unavailable. <Link to="/journal">Open my journal</Link>
      </p>
    );
  function guidedHTML() {
    const el = document.createElement("div");
    questions.Daily.forEach((q, i) => {
      if (answers[i]?.trim()) {
        for (const [tag, text] of [
          ["h2", q],
          ["p", answers[i]],
        ]) {
          const child = document.createElement(tag);
          child.textContent = text;
          el.append(child);
        }
      }
    });
    return el.innerHTML;
  }
  function combine() {
    area.current.insertAdjacentHTML("beforeend", guidedHTML());
    patch("content", clean(area.current.innerHTML));
    A([]);
    M("Free");
  }
  async function save() {
    const content = clean(e.content + guidedHTML());
    if (!plain(content) && !e.image && !e.title.trim())
      throw Error("Add a title, a thought, or a photo first.");
    P(true);
    try {
      await change(
        "journals",
        existing ? "PUT" : "POST",
        {
          ...e,
          title:
            e.title.trim() || plain(content).slice(0, 64) || "Journal entry",
          content,
          tags: e.tags.map((t) => t.trim()).filter(Boolean),
          duration: initial.current + seconds,
        },
        existing?.id,
      );
      sessionStorage.removeItem(draftKey);
      nav("/journal");
    } finally {
      P(false);
    }
  }
  return (
    <article className={focus ? "focus editor" : "editor"}>
      <header>
        <Link to="/journal">
          <ArrowLeft size={17} /> My journal
        </Link>
        <button onClick={() => F(!focus)}>
          <Maximize size={16} /> {focus ? "Exit focus" : "Focus"}
        </button>
      </header>
      <div className="paper">
        <div className="row">
          <input
            aria-label="Entry date"
            type="date"
            value={e.date}
            onChange={(v) => patch("date", v.target.value)}
          />
          <select
            aria-label="Writing mode"
            value={mode}
            onChange={(v) => M(v.target.value)}
          >
            {["Free", "Guided"].map(opt)}
          </select>
        </div>
        <input
          className="titleinput"
          placeholder="Give this day a title"
          aria-label="Entry title"
          value={e.title}
          onChange={(v) => patch("title", v.target.value)}
        />
        {mode === "Guided" && (
          <section>
            <Answers items={questions.Daily} answers={answers} set={A} />
            <button disabled={!answers.some((x) => x.trim())} onClick={combine}>
              Add answers to entry
            </button>
          </section>
        )}
        <div className="toolbar">
          {[
            [Bold, "bold"],
            [Italic, "italic"],
            [Heading2, "formatBlock"],
            [List, "insertUnorderedList"],
          ].map(([Icon, cmd]) => (
            <button
              key={cmd}
              aria-label={cmd}
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => {
                area.current.focus();
                document.execCommand(
                  cmd,
                  false,
                  cmd === "formatBlock" ? "h2" : undefined,
                );
                patch("content", area.current.innerHTML);
              }}
            >
              <Icon size={17} />
            </button>
          ))}
          <label className="upload">
            <ImagePlus size={18} /> Photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(ev) => {
                const file = ev.target.files[0];
                if (!file) return;
                if (
                  file.size > 1000000 ||
                  !["image/png", "image/jpeg", "image/webp"].includes(file.type)
                )
                  return report("Choose a JPEG, PNG, or WebP under 1 MB.");
                const reader = new FileReader();
                reader.onload = () => patch("image", reader.result);
                reader.readAsDataURL(file);
              }}
            />
          </label>
        </div>
        <div
          className="writing"
          style={{
            fontFamily: prefs.font === "Serif" ? "Georgia,serif" : "inherit",
            fontSize: prefs.size + "px",
          }}
          ref={area}
          role="textbox"
          aria-label="Journal content"
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          onDrop={(ev) => ev.preventDefault()}
          onPaste={(ev) => {
            ev.preventDefault();
            document.execCommand(
              "insertText",
              false,
              ev.clipboardData.getData("text/plain"),
            );
          }}
          onInput={() => patch("content", clean(area.current.innerHTML))}
        />
        {e.image && (
          <div>
            <img className="photo" src={e.image} alt="Journal attachment" />
            <button onClick={() => patch("image", null)}>Remove photo</button>
          </div>
        )}
        <small>
          {plain(e.content).split(/\s+/).filter(Boolean).length} words ·{" "}
          {Math.floor((initial.current + seconds) / 60)} min{" "}
          {(initial.current + seconds) % 60}s · {status}
        </small>
        <div className="filters">
          <label>
            Mood
            <select
              value={e.mood}
              onChange={(v) => patch("mood", v.target.value)}
            >
              <option value="">Optional</option>
              {moods.map(opt)}
            </select>
          </label>
          <label>
            Category
            <input
              list="categories"
              value={e.category}
              onChange={(v) => patch("category", v.target.value)}
            />
            <datalist id="categories">{categories.map(opt)}</datalist>
          </label>
          <label>
            Tags, comma separated
            <input
              value={e.tags.join(",")}
              onChange={(v) => patch("tags", v.target.value.split(","))}
            />
          </label>
        </div>
        <Chips
          items={emotions}
          values={e.emotions}
          set={(v) => patch("emotions", v)}
        />
        <footer>
          <button
            className="primary"
            disabled={pending}
            onClick={() => run(save)}
          >
            Save entry
          </button>
          {existing && (
            <button
              onClick={() =>
                run(async () => {
                  if (confirm("Delete this entry permanently?")) {
                    await change("journals", "DELETE", null, id);
                    sessionStorage.removeItem(draftKey);
                    nav("/journal");
                  }
                })
              }
            >
              Delete entry
            </button>
          )}
        </footer>
      </div>
    </article>
  );
}
