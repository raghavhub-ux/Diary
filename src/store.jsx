import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import DOMPurify from "dompurify";
import { defaults, sample, schemas } from "../shared/model";
export const clean = (html) =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "div",
      "br",
      "b",
      "strong",
      "i",
      "em",
      "h2",
      "ul",
      "li",
      "ol",
    ],
    ALLOWED_ATTR: [],
  });
export function plain(html) {
  const el = document.createElement("div");
  el.innerHTML = clean(html.replace(/<\/(p|div|li|h2)>/gi, " </$1>"));
  return el.textContent.trim();
}
export async function api(path, method = "GET", data) {
  const res = await fetch("/api/" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(data || {}),
  });
  const value = await res.json();
  if (!res.ok) throw Object.assign(Error(value.error), { status: res.status });
  return value;
}
const C = createContext(null);
export const useJournal = () => useContext(C);
const resources = Object.keys(schemas);
function cached(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function Provider({ children }) {
  const [user, setUser] = useState(null),
    [data, setData] = useState(null),
    [prefs, setPrefs] = useState(defaults),
    [loading, busy] = useState(true),
    [error, report] = useState("");
  const dataRef = useRef(null);
  function apply(value) {
    dataRef.current = value;
    setData(value);
  }
  async function enter(account) {
    if (account.demo) {
      apply(cached("ms-demo", sample()));
      setPrefs({ ...defaults, ...cached("ms-demo-prefs", {}) });
    } else {
      const all = await Promise.all([
        ...resources.map((k) => api(k)),
        api("settings"),
      ]);
      apply(Object.fromEntries(resources.map((k, i) => [k, all[i]])));
      setPrefs({ ...defaults, ...all.at(-1) });
    }
    setUser(account);
    report("");
  }
  useEffect(() => {
    api("auth/me")
      .then(enter)
      .catch((e) => {
        if (e.status !== 401)
          report("Account server unavailable. You can still explore the demo.");
      })
      .finally(() => busy(false));
  }, []);
  async function change(k, method, value, id) {
    let rows = dataRef.current[k],
      record;
    if (id === "") throw Error("Missing record ID");
    if (method !== "DELETE") value = schemas[k].parse(value);
    if (user.demo) {
      record = {
        ...rows.find((x) => x.id === id),
        ...value,
        id: id || crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
      };
      record.createdAt ??= record.updatedAt;
      if (k === "habits") record.completions ??= [];
    } else record = await api(k + (id ? "/" + id : ""), method, value);
    rows = dataRef.current[k];
    const next = {
      ...dataRef.current,
      [k]: id
        ? rows.flatMap((x) =>
            x.id !== id ? [x] : method === "DELETE" ? [] : [record],
          )
        : [record, ...rows],
    };
    if (user.demo) localStorage.setItem("ms-demo", JSON.stringify(next));
    apply(next);
    return record;
  }
  async function completion(h, date, status) {
    if (!user.demo)
      await api("habits/" + h.id + "/completions", "POST", { date, status });
    const next = {
      ...dataRef.current,
      habits: dataRef.current.habits.map((x) =>
        x.id !== h.id
          ? x
          : {
              ...x,
              completions: [
                ...x.completions.filter((c) => c.date !== date),
                { date, status },
              ],
            },
      ),
    };
    if (user.demo) localStorage.setItem("ms-demo", JSON.stringify(next));
    apply(next);
  }
  async function settings(next, name) {
    if (user.demo) {
      localStorage.setItem("ms-demo-prefs", JSON.stringify(next));
      localStorage.setItem("ms-demo-name", name);
    } else await api("settings", "PUT", { ...next, name });
    setPrefs(next);
    setUser({ ...user, name });
  }
  async function leave(deleted = false) {
    if (!user.demo && !deleted) await api("auth/logout", "POST");
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith("ms-draft:"))
      .forEach((k) => sessionStorage.removeItem(k));
    setUser(null);
    apply(null);
  }
  const run = async (fn) => {
    try {
      report("");
      await fn();
    } catch (e) {
      report(e.issues?.[0]?.message || e.message);
    }
  };
  return (
    <C.Provider
      value={{
        user,
        data,
        prefs,
        enter,
        change,
        completion,
        settings,
        leave,
        run,
        report,
        loading,
      }}
    >
      {error && (
        <div role="alert" className="alert">
          {error} <button onClick={() => report("")}>Dismiss</button>
        </div>
      )}
      {children}
    </C.Provider>
  );
}
