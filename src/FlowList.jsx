import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "flowlist_tasks_v1";

async function requestAndCheckPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function fireNotification(title) {
  if (Notification.permission === "granted") {
    new Notification("FlowList ⏰", { body: title, icon: "/favicon.ico", requireInteraction: true });
  }
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

function isOverdue(datetimeStr) {
  if (!datetimeStr) return false;
  return new Date(datetimeStr).getTime() < Date.now();
}

function getNextReminder(tasks) {
  const now = Date.now();
  return tasks
    .filter((t) => !t.done && t.datetime && new Date(t.datetime).getTime() > now)
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0] || null;
}

function getProductivityScore(tasks) {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100);
}

export default function FlowList() {
  const [tasks, setTasks] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  });
  const [title, setTitle] = useState("");
  const [datetime, setDatetime] = useState("");
  const [recurring, setRecurring] = useState("none");
  const [shake, setShake] = useState(false);
  const [justAdded, setJustAdded] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [notifGranted, setNotifGranted] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );
  const timers = useRef({});
  const titleInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    tasks.forEach((task) => {
      if (!task.done && task.datetime) {
        const delay = new Date(task.datetime).getTime() - Date.now();
        if (delay > 0) {
          timers.current[task.id] = setTimeout(() => fireNotification(task.title), delay);
        }
      }
    });
    return () => Object.values(timers.current).forEach(clearTimeout);
  }, [tasks]);

  const handleEnableNotifications = async () => {
    const granted = await requestAndCheckPermission();
    setNotifGranted(granted);
    if (granted) {
      new Notification("FlowList ⏰", { body: "Notifications enabled! You'll be reminded on time." });
    }
  };

  const addTask = useCallback(() => {
    if (!title.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    const newTask = { id: crypto.randomUUID(), title: title.trim(), datetime, recurring, done: false, createdAt: Date.now() };
    setTasks((prev) => [newTask, ...prev]);
    setJustAdded(newTask.id);
    setTimeout(() => setJustAdded(null), 600);
    setTitle("");
    setDatetime("");
    setRecurring("none");
    titleInputRef.current?.focus();
  }, [title, datetime, recurring]);

  const toggleDone = useCallback((id) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const saveEdit = useCallback(() => {
    if (!editTask || !editTask.title.trim()) return;
    setTasks((prev) => prev.map((t) => t.id === editTask.id ? { ...editTask, title: editTask.title.trim() } : t));
    setEditTask(null);
  }, [editTask]);

  const handleDragStart = (id) => setDragId(id);
  const handleDragOver = (e, id) => { e.preventDefault(); setDragOverId(id); };
  const handleDrop = (targetId) => {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    setTasks((prev) => {
      const arr = [...prev];
      const from = arr.findIndex((t) => t.id === dragId);
      const to = arr.findIndex((t) => t.id === targetId);
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
    setDragId(null);
    setDragOverId(null);
  };

  const score = getProductivityScore(tasks);
  const nextReminder = getNextReminder(tasks);
  const doneCount = tasks.filter((t) => t.done).length;
  const pendingCount = tasks.filter((t) => !t.done).length;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", padding: "24px 16px", display: "flex", alignItems: "flex-start", justifyContent: "center", fontFamily: "'DM Sans','Inter','Helvetica Neue',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.4); cursor: pointer; }
        @keyframes slideIn { from { opacity:0; transform:translateY(-10px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
        @keyframes pop { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
        @keyframes fadeIn { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
        .task-row { animation: slideIn 0.3s cubic-bezier(.22,.68,0,1.2) both; }
        .just-added { animation: pop 0.35s ease both; }
        .drag-over { outline: 1.5px dashed rgba(255,255,255,0.2); border-radius: 18px; }
        .shake-it { animation: shake 0.4s ease both; }
        .score-ring { transition: stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1); }
        button { cursor: pointer; font-family: inherit; }
        input, select { font-family: inherit; }
        .edit-btn { opacity: 0; transition: opacity 0.15s; }
        .task-row:hover .edit-btn { opacity: 1; }
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.75); display:flex; align-items:center; justify-content:center; z-index:100; animation: fadeIn 0.2s ease; padding: 20px; }
        .modal { background:#1a1a1a; border:1px solid #333; border-radius:24px; padding:28px; width:100%; max-width:420px; }
      `}</style>

      {/* EDIT MODAL */}
      {editTask && (
        <div className="overlay" onClick={(e) => e.target.classList.contains("overlay") && setEditTask(null)}>
          <div className="modal">
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Edit task</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 6 }}>Task title</label>
                <input
                  autoFocus
                  value={editTask.title}
                  onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditTask(null); }}
                  style={{ width: "100%", background: "#222", border: "1px solid #333", borderRadius: 12, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none" }}
                  onFocus={(e) => e.target.style.borderColor = "#555"}
                  onBlur={(e) => e.target.style.borderColor = "#333"}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 6 }}>Date & time</label>
                <input
                  type="datetime-local"
                  value={editTask.datetime}
                  onChange={(e) => setEditTask({ ...editTask, datetime: e.target.value })}
                  style={{ width: "100%", background: "#222", border: "1px solid #333", borderRadius: 12, padding: "12px 14px", color: "#aaa", fontSize: 14, outline: "none" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 6 }}>Repeat</label>
                <select
                  value={editTask.recurring}
                  onChange={(e) => setEditTask({ ...editTask, recurring: e.target.value })}
                  style={{ width: "100%", background: "#222", border: "1px solid #333", borderRadius: 12, padding: "12px 14px", color: "#aaa", fontSize: 14, outline: "none" }}
                >
                  <option value="none">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  onClick={() => setEditTask(null)}
                  style={{ flex: 1, background: "transparent", border: "1px solid #333", borderRadius: 12, padding: "12px", color: "#888", fontSize: 14 }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  style={{ flex: 1, background: "#fff", border: "none", borderRadius: 12, padding: "12px", color: "#000", fontSize: 14, fontWeight: 600 }}
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 880, display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>

        {/* LEFT PANEL */}
        <div style={{ background: "#141414", borderRadius: 28, padding: 28, border: "1px solid #222" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <div>
              <p style={{ fontSize: 10, letterSpacing: "0.3em", color: "#555", textTransform: "uppercase" }}>VibeCode</p>
              <h1 style={{ fontSize: 36, fontWeight: 700, marginTop: 4, letterSpacing: "-0.03em" }}>FlowList</h1>
            </div>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "#fff", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>✦</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="What needs to get done?"
              className={shake ? "shake-it" : ""}
              style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: 16, padding: "14px 18px", color: "#fff", fontSize: 14, outline: "none" }}
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

          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
            {tasks.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#444", fontSize: 14 }}>No tasks yet — add one above</div>
            )}
            {tasks.map((task) => {
              const overdue = !task.done && isOverdue(task.datetime);
              return (
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
                    border: `1px solid ${overdue ? "#5a2020" : "#2a2a2a"}`,
                    borderRadius: 18, padding: "14px 16px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    opacity: dragId === task.id ? 0.4 : 1,
                    cursor: "grab", transition: "opacity 0.15s, border-color 0.2s", gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                    <button
                      onClick={() => toggleDone(task.id)}
                      style={{ width: 26, height: 26, borderRadius: "50%", border: task.done ? "none" : "2px solid #444", background: task.done ? "#fff" : "transparent", color: "#000", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}
                    >
                      {task.done ? "✓" : ""}
                    </button>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: task.done ? "#555" : overdue ? "#e07070" : "#fff", textDecoration: task.done ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {task.title}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                        {task.datetime && (
                          <p style={{ fontSize: 12, color: overdue ? "#a04040" : "#555" }}>
                            {overdue ? "⚠ " : ""}{formatRelativeTime(task.datetime)}
                          </p>
                        )}
                        {task.recurring !== "none" && (
                          <span style={{ fontSize: 10, background: "#2a2a2a", color: "#888", padding: "2px 7px", borderRadius: 20 }}>{task.recurring}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <button
                      className="edit-btn"
                      onClick={() => setEditTask({ ...task })}
                      style={{ fontSize: 12, color: "#666", background: "#2a2a2a", border: "none", borderRadius: 8, padding: "4px 10px", transition: "color 0.15s, background 0.15s" }}
                      onMouseEnter={(e) => { e.target.style.color = "#fff"; e.target.style.background = "#333"; }}
                      onMouseLeave={(e) => { e.target.style.color = "#666"; e.target.style.background = "#2a2a2a"; }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      style={{ fontSize: 12, color: "#444", background: "none", border: "none", transition: "color 0.15s" }}
                      onMouseEnter={(e) => e.target.style.color = "#e55"}
                      onMouseLeave={(e) => e.target.style.color = "#444"}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={{ background: "#fff", borderRadius: 28, padding: 28, color: "#000" }}>
            <p style={{ fontSize: 10, letterSpacing: "0.3em", color: "#888", textTransform: "uppercase" }}>Productivity Pulse</p>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16 }}>
              <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
                <circle cx="36" cy="36" r="30" fill="none" stroke="#eee" strokeWidth="6" />
                <circle className="score-ring" cx="36" cy="36" r="30" fill="none" stroke="#000" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 30}`}
                  strokeDashoffset={`${2 * Math.PI * 30 * (1 - score / 100)}`}
                  transform="rotate(-90 36 36)"
                />
                <text x="36" y="41" textAnchor="middle" fontSize="16" fontWeight="700" fill="#000" fontFamily="DM Sans,sans-serif">{score}%</text>
              </svg>
              <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>
                {doneCount} done · {pendingCount} pending{score >= 80 ? " 🔥 Keep going!" : score >= 50 ? " Solid progress." : tasks.length === 0 ? " Add your first task." : " Let's get moving."}
              </p>
            </div>
          </div>

          <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 28, padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 12, color: "#555" }}>Next reminder</p>
                <h3 style={{ fontSize: 20, fontWeight: 600, marginTop: 6, letterSpacing: "-0.02em" }}>{nextReminder ? nextReminder.title : "Nothing scheduled"}</h3>
              </div>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⏰</div>
            </div>
            {nextReminder && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#1e1e1e", borderRadius: 16, border: "1px solid #2a2a2a" }}>
                <p style={{ fontSize: 13, color: "#aaa" }}>{formatRelativeTime(nextReminder.datetime)}</p>
              </div>
            )}
            {!nextReminder && <p style={{ marginTop: 12, fontSize: 13, color: "#444" }}>Add a task with a date/time to get reminded.</p>}
          </div>

          <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 28, padding: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Quick stats</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Total tasks", value: tasks.length },
                { label: "Completed", value: doneCount },
                { label: "Pending", value: pendingCount },
                { label: "With reminders", value: tasks.filter((t) => t.datetime).length },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "#1e1e1e", borderRadius: 16, padding: "14px 16px" }}>
                  <p style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>{label}</p>
                  <p style={{ fontSize: 24, fontWeight: 600 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {!notifGranted && (
            <button
              onClick={handleEnableNotifications}
              style={{ background: "#1e1e1e", border: "1px dashed #333", borderRadius: 20, padding: "16px 20px", color: "#888", fontSize: 13, textAlign: "left", transition: "border-color 0.2s, color 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#555"; e.currentTarget.style.color = "#ccc"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = "#888"; }}
            >
              ⏰ Enable notifications to get reminded when tasks are due →
            </button>
          )}
          {notifGranted && (
            <div style={{ background: "#0f1f0f", border: "1px solid #1a3a1a", borderRadius: 20, padding: "14px 20px", fontSize: 13, color: "#4a9a4a" }}>
              ✓ Notifications enabled — you'll be reminded on time
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
