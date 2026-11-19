import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
} from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sprout,
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Smile,
  CheckCheck,
  Leaf,
  NotebookPen,
  Sparkles,
  Settings2,
  PanelLeftClose,
  Menu,
  LogOut,
} from "lucide-react";
import { Provider, useJournal, api } from "./store";
import { Editor, Timeline } from "./Journal";
import { Dashboard, Mood, Calendar } from "./Overview";
import { Habits, Growth, Reviews, Insights } from "./Trackers";
import { Settings } from "./Settings";
import { day } from "../shared/model";
import "./styles.css";
const pages = [
  ["/", "Dashboard", LayoutDashboard, Dashboard],
  ["/journal", "My journal", BookOpen, Timeline],
  ["/calendar", "Calendar", CalendarDays, Calendar],
  ["/moods", "Mood tracker", Smile, Mood],
  ["/habits", "Habit tracker", CheckCheck, Habits],
  ["/growth", "My growth", Leaf, Growth],
  ["/reviews", "Weekly reviews", NotebookPen, Reviews],
  ["/insights", "Insights", Sparkles, Insights],
  ["/settings", "Settings", Settings2, Settings],
];
function Brand() {
  return (
    <span className="brand">
      <Sprout /> MindSpace
    </span>
  );
}
function Login() {
  const { enter, run } = useJournal(),
    [register, R] = useState(false),
    [pending, P] = useState(false);
  return (
    <div className="welcome">
      <div className="intro">
        <Brand />
        <div>
          <small>YOUR PERSONAL GROWTH JOURNAL</small>
          <h1>
            A little space
            <br />
            to reflect.
          </h1>
          <p>
            Write about your day, notice how you feel, and revisit the moments
            you want to keep.
          </p>
        </div>
        <div className="land" aria-hidden="true">
          <i />
          <b />
          <em />
        </div>
      </div>
      <div className="signin">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fields = Object.fromEntries(new FormData(e.target));
            run(async () => {
              P(true);
              try {
                await enter(
                  await api(
                    "auth/" + (register ? "register" : "login"),
                    "POST",
                    fields,
                  ),
                );
              } finally {
                P(false);
              }
            });
          }}
        >
          <h2>{register ? "Create your journal" : "Welcome back"}</h2>
          {register && (
            <label>
              Display name
              <input
                name="name"
                required
                maxLength={80}
                autoComplete="given-name"
              />
            </label>
          )}
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={register ? "new-password" : "current-password"}
            />
          </label>
          <button disabled={pending} className="primary">
            {pending ? "Opening…" : register ? "Create account" : "Sign in"}
          </button>
          <button type="button" onClick={() => R(!register)}>
            {register
              ? "Already have an account? Sign in"
              : "Create an account"}
          </button>
          <hr />
          <button
            type="button"
            onClick={() =>
              run(() =>
                enter({
                  id: "demo",
                  name: localStorage.getItem("ms-demo-name") || "Alex",
                  demo: true,
                }),
              )
            }
          >
            Explore sample journal ↗
          </button>
          <small>Demo changes stay in this browser.</small>
        </form>
      </div>
    </div>
  );
}
function Shell() {
  const { user, prefs, data, leave, run, loading } = useJournal(),
    loc = useLocation(),
    [collapsed, C] = useState(false),
    [menu, M] = useState(false),
    [reminder, T] = useState("");
  useEffect(() => {
    M(false);
  }, [loc.pathname]);
  useEffect(() => {
    if (!user || !prefs.lock) return;
    let timer;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => run(() => leave()), 600000);
    };
    arm();
    for (const e of ["pointerdown", "keydown", "scroll"])
      window.addEventListener(e, arm);
    return () => {
      clearTimeout(timer);
      for (const e of ["pointerdown", "keydown", "scroll"])
        window.removeEventListener(e, arm);
    };
  }, [user, prefs.lock]);
  useEffect(() => {
    T("");
    if (!user || !prefs.reminders) return;
    const tick = () => {
      const now = new Date(),
        hm = now.toTimeString().slice(0, 5);
      const due = data.habits.filter(
        (h) =>
          h.reminder === hm &&
          h.schedule.includes(now.getDay()) &&
          !h.completions.some((c) => c.date === day() && c.status !== "Open"),
      );
      T(due.map((h) => h.name).join(", "));
    };
    tick();
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, [user, data, prefs.reminders]);
  if (loading) return <p className="empty">Opening your journal…</p>;
  if (!user) return <Login />;
  function nav([path, label, Icon]) {
    return (
      <NavLink title={label} key={path} end={path === "/"} to={path}>
        <Icon size={18} />
        <span>{label}</span>
      </NavLink>
    );
  }
  return (
    <div
      className={
        "app " + (collapsed ? "collapsed " : "") + (menu ? "menu " : "")
      }
      data-theme={prefs.theme}
      data-accent={prefs.accent}
    >
      <aside>
        <Brand />
        <button
          className="collapse"
          aria-label="Toggle sidebar"
          onClick={() => C(!collapsed)}
        >
          <PanelLeftClose size={17} />
        </button>
        <nav>{pages.map(nav)}</nav>
        <div className="account">
          <small>{user.demo ? "LOCAL DEMO" : "PRIVATE JOURNAL"}</small>
          <b>{user.name}</b>
          <button title="Sign out" onClick={() => run(() => leave())}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      {menu && (
        <button
          className="backdrop"
          aria-label="Close menu"
          onClick={() => M(false)}
        />
      )}
      <main>
        <div className="mobilebrand">
          <Brand />
        </div>
        {reminder && (
          <p role="status" className="panel">
            Habit reminder · {reminder}
          </p>
        )}
        <motion.div
          key={loc.pathname + loc.search}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          <Routes>
            {pages.map(([path, , , Page]) => (
              <Route path={path} element={<Page />} key={path} />
            ))}
            <Route path="/journal/:id" element={<Editor />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </main>
      <nav className="bottom">
        {pages.slice(0, 3).map(nav)}
        <button onClick={() => M(!menu)}>
          <Menu size={18} />
          Menu
        </button>
      </nav>
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Provider>
      <Shell />
    </Provider>
  </BrowserRouter>,
);
