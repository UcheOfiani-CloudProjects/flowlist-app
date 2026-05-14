import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";

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

const C = {
  bg: "#FDF8F6",
  bgCard: "#FFFFFF",
  bgMuted: "#FDF0EB",
  border: "#EDD5C8",
  borderLight: "#F5E4DC",
  accent: "#A85C42",
  accentHover: "#8F4E38",
  accentLight: "#FAECE7",
  textPrimary: "#3D2B24",
  textSecondary: "#9A7068",
  textMuted: "#C4A89E",
  overdueText: "#8F4E38",
  overdueBorder: "#E8B4A0",
  successBg: "#F0F7EE",
  successBorder: "#B8D8B2",
  successText: "#3A6E34",
};

export default function FlowList({ session }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
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

 const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (!error) setTasks(data || []);
    setLoading(false);
  }, [session]);


useEffect(() => {
  fetchTasks();

  const channel = supabase
    .channel("tasks-channel")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tasks",
      },
      () => {
        fetchTasks();
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [fetchTasks]);

  useEffect(() => {
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

  const addTask = useCallback(async () => {
    if (!title.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    const newTask = {
      title: title.trim(),
      datetime: datetime || null,
      recurring,
      done: false,
      user_id: session.user.id,
    };
    const { data, error } = await supabase.from("tasks").insert([newTask]).select();
    if (!error && data) {
      setTasks((prev) => [data[0], ...prev]);
      setJustAdded(data[0].id);
      setTimeout(() => setJustAdded(null), 600);
    }
    setTitle("");
    setDatetime("");
    setRecurring("none");
    titleInputRef.current?.focus();
  }, [title, datetime, recurring, session]);

  const toggleDone = useCallback(async (id, currentDone) => {
    const { error } = await supabase.from("tasks").update({ done: !currentDone }).eq("id", id);
    if (!error) setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !currentDone } : t));
  }, []);

  const deleteTask = useCallback(async (id) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (!error) setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editTask || !editTask.title.trim()) return;
    const { error } = await supabase
      .from("tasks")
      .update({ title: editTask.title.trim(), datetime: editTask.datetime || null, recurring: editTask.recurring })
      .eq("id", editTask.id);
    if (!error) setTasks((prev) => prev.map((t) => t.id === editTask.id ? { ...editTask, title: editTask.title.trim() } : t));
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
    <div style={{ minHeight: "100vh", background: C.bg, color: C.textPrimary, padding: "24px 16px", display: "flex", alignItems: "flex-start", justifyContent: "center", fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: opacity(0.4); cursor: pointer; }
        @keyframes slideIn { from { opacity:0; transform:translateY(-10px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
        @keyframes pop { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
        @keyframes fadeIn { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .task-row { animation: slideIn 0.3s cubic-bezier(.22,.68,0,1.2) both; }
        .just-added { animation: pop 0.35s ease both; }
        .drag-over { outline: 1.5px dashed #EDD5C8; border-radius: 18px; }
        .shake-it { animation: shake 0.4s ease both; }
        .score-ring { transition: stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1); }
        .spinner { width: 20px; height: 20px; border: 2px solid #EDD5C8; border-top-color: #A85C42; border-radius: 50%; animation: spin 0.7s linear infinite; margin: 40px auto; }
        button { cursor: pointer; font-family: inherit; }
        input, select { font-family: inherit; color: ${C.textPrimary}; }
        input::placeholder { color: ${C.textMuted}; }
        .edit-btn { opacity: 0; transition: opacity 0.15s; }
        .task-row:hover .edit-btn { opacity: 1; }
        .overlay { position:fixed; inset:0; background:rgba(61,43,36,0.5); display:flex; align-items:center; justify-content:center; z-index:100; animation: fadeIn 0.2s ease; padding: 20px; }
        .modal { background:#FFF; border:1px solid #EDD5C8; border-radius:24px; padding:28px; width:100%; max-width:420px; }
      `}</style>

      {/* EDIT MODAL */}
      {editTask && (
        <div className="overlay" onClick={(e) => e.target.classList.contains("overlay") && setEditTask(null)}>
          <div className="modal">
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: C.textPrimary }}>Edit task</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: C.textSecondary, display: "block", marginBottom: 6 }}>Task title</label>
                <input
                  autoFocus
                  value={editTask.title}
                  onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditTask(null); }}
                  style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", color: C.textPrimary, fontSize: 14, outline: "none" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textSecondary, display: "block", marginBottom: 6 }}>Date & time</label>
                <input
                  type="datetime-local"
                  value={editTask.datetime || ""}
                  onChange={(e) => setEditTask({ ...editTask, datetime: e.target.value })}
                  style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", color: C.textSecondary, fontSize: 14, outline: "none" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textSecondary, display: "block", marginBottom: 6 }}>Repeat</label>
                <select
                  value={editTask.recurring}
                  onChange={(e) => setEditTask({ ...editTask, recurring: e.target.value })}
                  style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", color: C.textSecondary, fontSize: 14, outline: "none" }}
                >
                  <option value="none">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setEditTask(null)} style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px", color: C.textSecondary, fontSize: 14 }}>
                  Cancel
                </button>
                <button onClick={saveEdit} style={{ flex: 1, background: C.accent, border: "none", borderRadius: 12, padding: "12px", color: "#fff", fontSize: 14, fontWeight: 600 }}>
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 880, display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>

        {/* LEFT PANEL */}
        <div style={{ background: C.bgCard, borderRadius: 28, padding: 28, border: `1px solid ${C.borderLight}`, boxShadow: "0 2px 20px rgba(168,92,66,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <div>
              <p style={{ fontSize: 10, letterSpacing: "0.3em", color: C.textMuted, textTransform: "uppercase" }}>VibeCode</p>
              <h1 style={{ fontSize: 36, fontWeight: 700, marginTop: 4, letterSpacing: "-0.03em", color: C.textPrimary }}>FlowList</h1>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>✦</div>
              <button
                onClick={() => supabase.auth.signOut()}
                style={{ fontSize: 12, color: C.textMuted, background: "none", border: `1px solid ${C.borderLight}`, borderRadius: 10, padding: "6px 14px", transition: "color 0.15s" }}
                onMouseEnter={(e) => e.target.style.color = C.accent}
                onMouseLeave={(e) => e.target.style.color = C.textMuted}
              >
                Sign out
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="What needs to get done?"
              className={shake ? "shake-it" : ""}
              style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: "14px 18px", fontSize: 14, outline: "none" }}
              onFocus={(e) => e.target.style.borderColor = C.accent}
              onBlur={(e) => e.target.style.borderColor = C.border}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
              <input
                type="datetime-local"
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
                style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: "12px 16px", color: C.textSecondary, fontSize: 13, outline: "none" }}
              />
              <select
                value={recurring}
                onChange={(e) => setRecurring(e.target.value)}
                style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: "12px 14px", color: C.textSecondary, fontSize: 12, outline: "none" }}
              >
                <option value="none">Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <button
              onClick={addTask}
              style={{ width: "100%", background: C.accent, color: "#fff", fontWeight: 600, fontSize: 15, padding: "14px", borderRadius: 16, border: "none", transition: "transform 0.15s, background 0.15s" }}
              onMouseEnter={(e) => { e.target.style.background = C.accentHover; e.target.style.transform = "scale(1.01)"; }}
              onMouseLeave={(e) => { e.target.style.background = C.accent; e.target.style.transform = "scale(1)"; }}
            >
              Add Task
            </button>
          </div>

          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
            {loading && <div className="spinner" />}
            {!loading && tasks.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 0", color: C.textMuted, fontSize: 14 }}>No tasks yet — add one above</div>
            )}
            {!loading && tasks.map((task) => {
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
                    background: task.done ? C.bg : C.bgCard,
                    border: `1px solid ${overdue ? C.overdueBorder : C.borderLight}`,
                    borderRadius: 18, padding: "14px 16px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    opacity: dragId === task.id ? 0.4 : 1,
                    cursor: "grab", transition: "opacity 0.15s, border-color 0.2s", gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                    <button
                      onClick={() => toggleDone(task.id, task.done)}
                      style={{ width: 24, height: 24, borderRadius: "50%", border: task.done ? "none" : `2px solid ${C.border}`, background: task.done ? C.accent : "transparent", color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}
                    >
                      {task.done ? "✓" : ""}
                    </button>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: task.done ? C.textMuted : overdue ? C.overdueText : C.textPrimary, textDecoration: task.done ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {task.title}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                        {task.datetime && (
                          <p style={{ fontSize: 12, color: overdue ? C.overdueText : C.textMuted }}>
                            {overdue ? "⚠ " : ""}{formatRelativeTime(task.datetime)}
                          </p>
                        )}
                        {task.recurring !== "none" && (
                          <span style={{ fontSize: 10, background: C.accentLight, color: C.accent, padding: "2px 7px", borderRadius: 20, fontWeight: 500 }}>{task.recurring}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <button
                      className="edit-btn"
                      onClick={() => setEditTask({ ...task })}
                      style={{ fontSize: 12, color: C.textMuted, background: C.bg, border: "none", borderRadius: 8, padding: "4px 10px", transition: "color 0.15s" }}
                      onMouseEnter={(e) => e.target.style.color = C.accent}
                      onMouseLeave={(e) => e.target.style.color = C.textMuted}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      style={{ fontSize: 12, color: C.textMuted, background: "none", border: "none", transition: "color 0.15s" }}
                      onMouseEnter={(e) => e.target.style.color = "#c0392b"}
                      onMouseLeave={(e) => e.target.style.color = C.textMuted}
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

          {/* PRODUCTIVITY PULSE */}
          <div style={{ background: C.bgCard, borderRadius: 28, padding: 28, border: `1px solid ${C.borderLight}`, boxShadow: "0 2px 20px rgba(168,92,66,0.06)" }}>
            <p style={{ fontSize: 10, letterSpacing: "0.3em", color: C.textMuted, textTransform: "uppercase" }}>Productivity Pulse</p>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16 }}>
              <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
                <circle cx="36" cy="36" r="30" fill="none" stroke={C.borderLight} strokeWidth="6" />
                <circle className="score-ring" cx="36" cy="36" r="30" fill="none" stroke={C.accent} strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 30}`}
                  strokeDashoffset={`${2 * Math.PI * 30 * (1 - score / 100)}`}
                  transform="rotate(-90 36 36)"
                />
                <text x="36" y="41" textAnchor="middle" fontSize="16" fontWeight="700" fill={C.accent} fontFamily="DM Sans,sans-serif">{score}%</text>
              </svg>
              <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
                {doneCount} done · {pendingCount} pending{score >= 80 ? " 🔥 Keep going!" : score >= 50 ? " Solid progress." : tasks.length === 0 ? " Add your first task." : " Let's get moving."}
              </p>
            </div>
          </div>

          {/* NEXT REMINDER */}
          <div style={{ background: C.bgMuted, border: `1px solid ${C.borderLight}`, borderRadius: 28, padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 12, color: C.textMuted }}>Next reminder</p>
                <h3 style={{ fontSize: 20, fontWeight: 600, marginTop: 6, letterSpacing: "-0.02em", color: C.textPrimary }}>{nextReminder ? nextReminder.title : "Nothing scheduled"}</h3>
              </div>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⏰</div>
            </div>
            {nextReminder && (
              <div style={{ marginTop: 16, padding: "12px 16px", background: C.bgCard, borderRadius: 16, border: `1px solid ${C.borderLight}` }}>
                <p style={{ fontSize: 13, color: C.textSecondary }}>{formatRelativeTime(nextReminder.datetime)}</p>
              </div>
            )}
            {!nextReminder && <p style={{ marginTop: 12, fontSize: 13, color: C.textMuted }}>Add a task with a date/time to get reminded.</p>}
          </div>

          {/* STATS */}
          <div style={{ background: C.bgCard, border: `1px solid ${C.borderLight}`, borderRadius: 28, padding: 28, boxShadow: "0 2px 20px rgba(168,92,66,0.06)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: C.textPrimary }}>Quick stats</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Total tasks", value: tasks.length },
                { label: "Completed", value: doneCount },
                { label: "Pending", value: pendingCount },
                { label: "With reminders", value: tasks.filter((t) => t.datetime).length },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: C.bg, borderRadius: 16, padding: "14px 16px", border: `1px solid ${C.borderLight}` }}>
                  <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>{label}</p>
                  <p style={{ fontSize: 24, fontWeight: 600, color: C.textPrimary }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {!notifGranted && (
            <button
              onClick={handleEnableNotifications}
              style={{ background: C.accentLight, border: `1px dashed ${C.border}`, borderRadius: 20, padding: "16px 20px", color: C.textSecondary, fontSize: 13, textAlign: "left", transition: "border-color 0.2s, color 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}
            >
              ⏰ Enable notifications to get reminded when tasks are due →
            </button>
          )}
          {notifGranted && (
            <div style={{ background: C.successBg, border: `1px solid ${C.successBorder}`, borderRadius: 20, padding: "14px 20px", fontSize: 13, color: C.successText }}>
              ✓ Notifications enabled — you'll be reminded on time
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
