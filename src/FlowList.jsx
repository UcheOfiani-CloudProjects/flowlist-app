import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "flowlist_tasks_v1";

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

let swRegistration = null;

async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
  } catch (e) {
    console.warn('SW registration failed:', e);
  }
}

function scheduleNotification(task) {
  if (!task.datetime || !task.id) return null;
  const fireAt = new Date(task.datetime).getTime();
  if (fireAt <= Date.now()) return null;
  const sw = swRegistration?.active || navigator.serviceWorker?.controller;
  if (sw && Notification.permission === 'granted') {
    sw.postMessage({ type: 'SCHEDULE_NOTIFICATION', id: task.id, title: task.title, fireAt });
    return task.id;
  }
  const delay = fireAt - Date.now();
  const timerId = setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification('FlowList reminder', { body: task.title, icon: '/favicon.ico' });
    }
  }, delay);
  return timerId;
}

function formatRelativeTime(datetimeStr) {
  if (!datetimeStr) return "";
  const date = new Date(datetimeStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const taskDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (taskDay.getTime() === today.getTime()) return `Today • ${timeStr}`;
  if (taskDay.getTime() === tomorrow.getTime()) return `Tomorrow • ${timeStr}`;
  return `${date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} • ${timeStr}`;
}

function getNextReminder(tasks) {
  const now = Date.now();
  return tasks
    .filter((t) => !t.done && t.datetime && new Date(t.datetime).getTime() > now)
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0] || null;
}

function getProductivityScore(tasks) {
  if (!tasks.length) return 0;
  const done = tasks.filter((t) => t.done).length;
  return Math.round((done / tasks.length) * 100);
}

const DRAG_NONE = null;

export default function FlowList() {
  const [tasks, setTasks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });
  const [title, setTitle] = useState("");
  const [datetime, setDatetime] = useState("");
  const [recurring, setRecurring] = useState("none");
  const [dragId, setDragId] = useState(DRAG_NONE);
  const [dragOverId, setDragOverId] = useState(DRAG_NONE);
  const [shake, setShake] = useState(false);
  const [justAdded, setJustAdded] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const editInputRef = useRef(null);
  const timers = useRef({});

  useEffect(() => {
    registerSW();
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    tasks.forEach((task) => {
      if (!task.done) {
        const id = scheduleNotification(task);
        if (id) timers.current[task.id] = id;
      }
    });
    return () => Object.values(timers.current).forEach(clearTimeout);
  }, [tasks]);

  const addTask = useCallback(() => {
    if (!title.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    const newTask = {
      id: crypto.randomUUID(),
      title: title.trim(),
      datetime,
      recurring,
      done: false,
      createdAt: Date.now(),
    };
    setTasks((prev) => [newTask, ...prev]);
    setJustAdded(newTask.id);
    setTimeout(() => setJustAdded(null), 600);
    setTitle("");
    setDatetime("");
    setRecurring("none");
  }, [title, datetime, recurring]);

  const toggleDone = useCallback((id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const startEditing = useCallback((task) => {
    setEditingId(task.id);
    setEditingTitle(task.title);
    setTimeout(() => editInputRef.current?.focus(), 0);
  }, []);

  const saveEdit = useCallback((id) => {
    if (!editingTitle.trim()) return;
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, title: editingTitle.trim() } : t));
    setEditingId(null);
    setEditingTitle("");
  }, [editingTitle]);

  const handleDragStart = (id) => setDragId(id);
  const handleDragOver = (e, id) => { e.preventDefault(); setDragOverId(id); };
  const handleDrop = (targetId) => {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    setTasks((prev) => {
      const arr = [...prev];
      const fromIdx = arr.findIndex((t) => t.id === dragId);
      const toIdx = arr.findIndex((t) => t.id === targetId);
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
    setDragId(null);
    setDragOverId(null);
  };

  const score = getProductivityScore(tasks);
  const nextReminder = getNextReminder(tasks);
  const pendingCount = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#fff",
      padding: "24px 16px",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: rgba(255,255,255,0.15); }
        input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.4); cursor: pointer; }
        @keyframes slideIn { from { opacity:0; transform:translateY(-12px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes pop { 0%{transform:scale(1)} 50%{transform:scale(1.04)} 100%{transform:scale(1)} }
        .task-row { animation: slideIn 0.35s cubic-bezier(.22,.68,0,1.2) both; }
        .task-row.just-added { animation: pop 0.4s ease both; }
        .drag-over { outline: 1.5px dashed rgba(255,255,255,0.25); border-radius: 18px; }
        .shake-it { animation: shake 0.4s ease both; }
        .score-ring { transition: stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1); }
        button { cursor: pointer; font-family: inherit; }
        input, select { font-family: inherit; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 880, display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>

        {/* LEFT PANEL */}
        <div style={{ background: "#141414", borderRadius: 28, padding: 28, border: "1px solid #222" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <div>
              <p style={{ fontSize: 10, letterSpacing: "0.3em", color: "#555", textTransform: "uppercase" }}>VibeCode</p>
              <h1 style={{ fontSize: 36, fontWeight: 700, marginTop: 4, letterSpacing: "-0.03em" }}>FlowList</h1>
            </div>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "#fff", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, flexShrink: 0 }}>✦</div>
          </div>

          {/* INPUT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="What needs to get done?"
              className={shake ? "shake-it" : ""}
              style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: 16, padding: "14px 18px", color: "#fff", fontSize: 14, outline: "none", transition: "border-color 0.2s" }}
              onFocus={(e) => e.target.style.borderColor = "#444"}
              onBlur={(e) => e.target.style.borderColor = "#2a2a2a"}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
              <input
                type="datetime-local"
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
                style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: 16, padding: "12px 16px", color: "#aaa", fontSize: 13, outline: "none" }}
              />
              <select
                value={recurring}
                onChange={(e) => setRecurring(e.target.value)}
                style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: 16, padding: "12px 14px", color: "#aaa", fontSize: 12, outline: "none" }}
              >
                <option value="none">Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <button
              onClick={addTask}
              style={{ width: "100%", background: "#fff", color: "#000", fontWeight: 600, fontSize: 15, padding: "14px", borderRadius: 16, border: "none", transition: "transform 0.15s, background 0.15s" }}
              onMouseEnter={(e) => { e.target.style.background = "#e8e8e8"; e.target.style.transform = "scale(1.01)"; }}
              onMouseLeave={(e) => { e.target.style.background = "#fff"; e.target.style.transform = "scale(1)"; }}
            >
              Add Task
            </button>
          </div>

          {/* TASKS */}
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
            {tasks.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#444", fontSize: 14 }}>
                No tasks yet — add one above
              </div>
            )}
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`task-row${justAdded === task.id ? " just-added" : ""}${dragOverId === task.id ? " drag-over" : ""}`}
                draggable
                onDragStart={() => handleDragStart(task.id)}
                onDragOver={(e) => handleDragOver(e, task.id)}
                onDrop={() => handleDrop(task.id)}
                onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                style={{
                  background: dragId === task.id ? "#1a1a1a" : "#1e1e1e",
                  border: "1px solid #2a2a2a",
                  borderRadius: 18,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  opacity: dragId === task.id ? 0.5 : 1,
                  cursor: "grab",
                  transition: "opacity 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                  <button
                    onClick={() => toggleDone(task.id)}
                    style={{
                      width: 26, height: 26, borderRadius: "50%",
                      border: task.done ? "none" : "2px solid #444",
                      background: task.done ? "#fff" : "transparent",
                      color: "#000", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, transition: "all 0.2s",
                    }}
                  >
                    {task.done ? "✓" : ""}
                  </button>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    {editingId === task.id ? (
                      <input
                        ref={editInputRef}
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(task.id); if (e.key === "Escape") setEditingId(null); }}
                        onBlur={() => saveEdit(task.id)}
                        style={{ background: "#2a2a2a", border: "1px solid #444", borderRadius: 8, padding: "4px 10px", color: "#fff", fontSize: 14, fontWeight: 500, width: "100%", outline: "none" }}
                      />
                    ) : (
                      <p
                        onDoubleClick={() => !task.done && startEditing(task)}
                        title={task.done ? "" : "Double-click to edit"}
                        style={{ fontSize: 14, fontWeight: 500, color: task.done ? "#555" : "#fff", textDecoration: task.done ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: task.done ? "default" : "text" }}
                      >
                        {task.title}
                      </p>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                      {task.datetime && (
                        <p style={{ fontSize: 12, color: "#555" }}>{formatRelativeTime(task.datetime)}</p>
                      )}
                      {task.recurring !== "none" && (
                        <span style={{ fontSize: 10, background: "#2a2a2a", color: "#888", padding: "2px 7px", borderRadius: 20, letterSpacing: "0.04em" }}>
                          {task.recurring}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  style={{ fontSize: 12, color: "#444", background: "none", border: "none", paddingLeft: 12, flexShrink: 0, transition: "color 0.15s" }}
                  onMouseEnter={(e) => e.target.style.color = "#e55"}
                  onMouseLeave={(e) => e.target.style.color = "#444"}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* PRODUCTIVITY PULSE */}
          <div style={{ background: "#fff", borderRadius: 28, padding: 28, color: "#000" }}>
            <p style={{ fontSize: 10, letterSpacing: "0.3em", color: "#888", textTransform: "uppercase" }}>Productivity Pulse</p>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16 }}>
              <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
                <circle cx="36" cy="36" r="30" fill="none" stroke="#eee" strokeWidth="6" />
                <circle
                  className="score-ring"
                  cx="36" cy="36" r="30"
                  fill="none" stroke="#000" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 30}`}
                  strokeDashoffset={`${2 * Math.PI * 30 * (1 - score / 100)}`}
                  transform="rotate(-90 36 36)"
                />
                <text x="36" y="41" textAnchor="middle" fontSize="16" fontWeight="700" fill="#000" fontFamily="DM Sans, sans-serif">{score}%</text>
              </svg>
              <div>
                <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>
                  {doneCount} done · {pendingCount} pending
                  {score >= 80 ? " 🔥 Keep going!" : score >= 50 ? " Solid progress." : tasks.length === 0 ? " Add your first task." : " Let's get moving."}
                </p>
              </div>
            </div>
          </div>

          {/* NEXT REMINDER */}
          <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 28, padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 12, color: "#555" }}>Next reminder</p>
                <h3 style={{ fontSize: 20, fontWeight: 600, marginTop: 6, letterSpacing: "-0.02em" }}>
                  {nextReminder ? nextReminder.title : "Nothing scheduled"}
                </h3>
              </div>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⏰</div>
            </div>
            {nextReminder && (
              <div style={{ marginTop: 18, padding: "12px 16px", background: "#1e1e1e", borderRadius: 16, border: "1px solid #2a2a2a" }}>
                <p style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>
                  {formatRelativeTime(nextReminder.datetime)}
                </p>
              </div>
            )}
            {!nextReminder && (
              <p style={{ marginTop: 12, fontSize: 13, color: "#444" }}>Add a task with a date/time to get reminded.</p>
            )}
          </div>

          {/* STATS */}
          <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 28, padding: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Quick stats</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Total tasks", value: tasks.length },
                { label: "Completed", value: doneCount },
                { label: "Pending", value: pendingCount },
                { label: "With reminders", value: tasks.filter(t => t.datetime).length },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "#1e1e1e", borderRadius: 16, padding: "14px 16px" }}>
                  <p style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>{label}</p>
                  <p style={{ fontSize: 24, fontWeight: 600 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* NOTIFICATION PROMPT */}
          {"Notification" in window && Notification.permission === "default" && (
            <button
              onClick={requestNotificationPermission}
              style={{ background: "#1e1e1e", border: "1px dashed #333", borderRadius: 20, padding: "16px 20px", color: "#888", fontSize: 13, textAlign: "left", transition: "border-color 0.2s, color 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#555"; e.currentTarget.style.color = "#ccc"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = "#888"; }}
            >
              ⏰ Enable notifications to get reminded when tasks are due →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
