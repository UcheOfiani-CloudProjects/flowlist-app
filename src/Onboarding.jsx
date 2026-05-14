import { useState } from "react";
import { supabase } from "./supabaseClient";

const C = {
  bg: "#FDF8F6",
  bgCard: "#FFFFFF",
  border: "#EDD5C8",
  accent: "#A85C42",
  accentHover: "#8F4E38",
  accentLight: "#FAECE7",
  textPrimary: "#3D2B24",
  textSecondary: "#9A7068",
  textMuted: "#C4A89E",
};

const USE_CASES = [
  { value: "work", label: "Work", emoji: "💼", desc: "Meetings, projects, deadlines" },
  { value: "personal", label: "Personal", emoji: "🌸", desc: "Errands, goals, self care" },
  { value: "both", label: "Both", emoji: "✨", desc: "All of the above" },
];

const TASK_LOADS = [
  { value: "few", label: "Just a few", emoji: "🌿", desc: "1–5 tasks a day" },
  { value: "decent", label: "A decent amount", emoji: "🌻", desc: "6–15 tasks a day" },
  { value: "lots", label: "A lot", emoji: "🔥", desc: "15+ tasks a day" },
];

function AnimatedIcon({ size = 64 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.42, flexShrink: 0,
      animation: "spinTwinkle 4s ease-in-out infinite, colorShift 6s ease-in-out infinite",
      boxShadow: "0 4px 24px rgba(168,92,66,0.18)",
    }}>
      ✦
    </div>
  );
}

export default function Onboarding({ session, onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [useCase, setUseCase] = useState("");
  const [taskLoad, setTaskLoad] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from("profiles").upsert({
      id: session.user.id,
      display_name: name.trim(),
      use_case: useCase,
      task_load: taskLoad,
    });
    setSaving(false);
    onComplete({ display_name: name.trim(), use_case: useCase, task_load: taskLoad });
  };

  const canNext = step === 1 ? name.trim().length > 0 : step === 2 ? useCase : step === 3 ? taskLoad : true;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: ${C.textMuted}; }
        @keyframes spinTwinkle {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(90deg) scale(1.08); }
          50% { transform: rotate(180deg) scale(1); }
          75% { transform: rotate(270deg) scale(1.08); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes colorShift {
          0% { background: #A85C42; color: #fff; }
          25% { background: #C4735A; color: #fff; }
          50% { background: #D4956E; color: #fff; }
          75% { background: #B87A5A; color: #fff; }
          100% { background: #A85C42; color: #fff; }
        }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .step { animation: fadeUp 0.4s cubic-bezier(.22,.68,0,1.2) both; }
        .option-card { border: 1.5px solid ${C.border}; border-radius: 16px; padding: 16px 18px; cursor: pointer; transition: all 0.2s; background: ${C.bgCard}; display: flex; align-items: center; gap: 14px; }
        .option-card:hover { border-color: ${C.accent}; background: ${C.accentLight}; }
        .option-card.selected { border-color: ${C.accent}; background: ${C.accentLight}; }
        .dot-row { display: flex; gap: 8px; justify-content: center; margin-top: 8px; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: ${C.border}; transition: background 0.2s, width 0.2s; }
        .dot.active { background: ${C.accent}; width: 20px; border-radius: 4px; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* STEP 0 — Welcome */}
        {step === 0 && (
          <div className="step" style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <AnimatedIcon size={80} />
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.03em", marginBottom: 12 }}>
              Welcome to FlowList
            </h1>
            <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.7, marginBottom: 36 }}>
              Your personal space to stay on top of everything. Let's get you set up in 3 quick steps.
            </p>
            <button
              onClick={() => setStep(1)}
              style={{ width: "100%", background: C.accent, color: "#fff", fontWeight: 600, fontSize: 15, padding: "15px", borderRadius: 16, border: "none", cursor: "pointer", transition: "background 0.2s" }}
              onMouseEnter={(e) => e.target.style.background = C.accentHover}
              onMouseLeave={(e) => e.target.style.background = C.accent}
            >
              Let's go →
            </button>
          </div>
        )}

        {/* STEP 1 — Name */}
        {step === 1 && (
          <div className="step" style={{ background: C.bgCard, borderRadius: 28, padding: 36, border: `1px solid ${C.border}`, boxShadow: "0 2px 20px rgba(168,92,66,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <AnimatedIcon size={56} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.02em", marginBottom: 8, textAlign: "center" }}>
              What should we call you?
            </h2>
            <p style={{ fontSize: 13, color: C.textMuted, textAlign: "center", marginBottom: 24 }}>
              A nickname, first name, whatever feels right.
            </p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canNext && setStep(2)}
              placeholder="e.g. Mo, Maureen, Queen 👑"
              style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 18px", color: C.textPrimary, fontSize: 15, outline: "none", marginBottom: 20, textAlign: "center" }}
              onFocus={(e) => e.target.style.borderColor = C.accent}
              onBlur={(e) => e.target.style.borderColor = C.border}
            />
            <button
              onClick={() => setStep(2)}
              disabled={!canNext}
              style={{ width: "100%", background: canNext ? C.accent : C.border, color: "#fff", fontWeight: 600, fontSize: 15, padding: "14px", borderRadius: 14, border: "none", cursor: canNext ? "pointer" : "not-allowed", transition: "background 0.2s" }}
              onMouseEnter={(e) => { if (canNext) e.target.style.background = C.accentHover; }}
              onMouseLeave={(e) => { if (canNext) e.target.style.background = C.accent; }}
            >
              Continue →
            </button>
            <div className="dot-row" style={{ marginTop: 20 }}>
              <div className="dot active" /><div className="dot" /><div className="dot" />
            </div>
          </div>
        )}

        {/* STEP 2 — Use case */}
        {step === 2 && (
          <div className="step" style={{ background: C.bgCard, borderRadius: 28, padding: 36, border: `1px solid ${C.border}`, boxShadow: "0 2px 20px rgba(168,92,66,0.08)" }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.02em", marginBottom: 8, textAlign: "center" }}>
              What are you using this for, {name}?
            </h2>
            <p style={{ fontSize: 13, color: C.textMuted, textAlign: "center", marginBottom: 24 }}>
              This helps us personalise your experience.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {USE_CASES.map((opt) => (
                <div
                  key={opt.value}
                  className={`option-card${useCase === opt.value ? " selected" : ""}`}
                  onClick={() => setUseCase(opt.value)}
                >
                  <span style={{ fontSize: 24 }}>{opt.emoji}</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{opt.label}</p>
                    <p style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{opt.desc}</p>
                  </div>
                  {useCase === opt.value && (
                    <div style={{ marginLeft: "auto", width: 20, height: 20, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11 }}>✓</div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(3)}
              disabled={!canNext}
              style={{ width: "100%", background: canNext ? C.accent : C.border, color: "#fff", fontWeight: 600, fontSize: 15, padding: "14px", borderRadius: 14, border: "none", cursor: canNext ? "pointer" : "not-allowed", transition: "background 0.2s" }}
              onMouseEnter={(e) => { if (canNext) e.target.style.background = C.accentHover; }}
              onMouseLeave={(e) => { if (canNext) e.target.style.background = C.accent; }}
            >
              Continue →
            </button>
            <div className="dot-row" style={{ marginTop: 20 }}>
              <div className="dot" /><div className="dot active" /><div className="dot" />
            </div>
          </div>
        )}

        {/* STEP 3 — Task load */}
        {step === 3 && (
          <div className="step" style={{ background: C.bgCard, borderRadius: 28, padding: 36, border: `1px solid ${C.border}`, boxShadow: "0 2px 20px rgba(168,92,66,0.08)" }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.02em", marginBottom: 8, textAlign: "center" }}>
              How busy are you usually?
            </h2>
            <p style={{ fontSize: 13, color: C.textMuted, textAlign: "center", marginBottom: 24 }}>
              No judgment — we just want to set the right tone.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {TASK_LOADS.map((opt) => (
                <div
                  key={opt.value}
                  className={`option-card${taskLoad === opt.value ? " selected" : ""}`}
                  onClick={() => setTaskLoad(opt.value)}
                >
                  <span style={{ fontSize: 24 }}>{opt.emoji}</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{opt.label}</p>
                    <p style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{opt.desc}</p>
                  </div>
                  {taskLoad === opt.value && (
                    <div style={{ marginLeft: "auto", width: 20, height: 20, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11 }}>✓</div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={handleSave}
              disabled={!canNext || saving}
              style={{ width: "100%", background: canNext ? C.accent : C.border, color: "#fff", fontWeight: 600, fontSize: 15, padding: "14px", borderRadius: 14, border: "none", cursor: canNext ? "pointer" : "not-allowed", transition: "background 0.2s" }}
              onMouseEnter={(e) => { if (canNext) e.target.style.background = C.accentHover; }}
              onMouseLeave={(e) => { if (canNext) e.target.style.background = C.accent; }}
            >
              {saving ? "Setting up..." : "Take me to FlowList ✦"}
            </button>
            <div className="dot-row" style={{ marginTop: 20 }}>
              <div className="dot" /><div className="dot" /><div className="dot active" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
