import { useState } from "react";
import { supabase } from "./supabaseClient";

const C = {
  bg: "#FDF8F6",
  bgCard: "#FFFFFF",
  border: "#EDD5C8",
  accent: "#A85C42",
  accentHover: "#8F4E38",
  textPrimary: "#3D2B24",
  textSecondary: "#9A7068",
  textMuted: "#C4A89E",
};

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAuth = async () => {
    setLoading(true);
    setMessage("");
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    else if (isSignUp) setMessage("Check your email to confirm your account!");
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: ${C.textMuted}; }
      `}</style>

      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 28, padding: 36, width: "100%", maxWidth: 400, boxShadow: "0 2px 20px rgba(168,92,66,0.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>✦</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.03em" }}>FlowList</h1>
          <p style={{ fontSize: 13, color: C.textMuted, marginTop: 6 }}>{isSignUp ? "Create your account" : "Welcome back"}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 18px", color: C.textPrimary, fontSize: 14, outline: "none", transition: "border-color 0.2s" }}
            onFocus={(e) => e.target.style.borderColor = C.accent}
            onBlur={(e) => e.target.style.borderColor = C.border}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 18px", color: C.textPrimary, fontSize: 14, outline: "none", transition: "border-color 0.2s" }}
            onFocus={(e) => e.target.style.borderColor = C.accent}
            onBlur={(e) => e.target.style.borderColor = C.border}
          />

          {message && (
            <p style={{ fontSize: 13, color: message.includes("Check") ? "#3A6E34" : "#8F4E38", textAlign: "center", padding: "8px 12px", background: message.includes("Check") ? "#F0F7EE" : "#FAECE7", borderRadius: 10 }}>
              {message}
            </p>
          )}

          <button
            onClick={handleAuth}
            disabled={loading}
            style={{ background: loading ? C.textMuted : C.accent, color: "#fff", fontWeight: 600, fontSize: 15, padding: "14px", borderRadius: 14, border: "none", cursor: loading ? "not-allowed" : "pointer", transition: "background 0.2s, transform 0.15s", marginTop: 4 }}
            onMouseEnter={(e) => { if (!loading) e.target.style.background = C.accentHover; }}
            onMouseLeave={(e) => { if (!loading) e.target.style.background = C.accent; }}
          >
            {loading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
          </button>

          <button
            onClick={() => { setIsSignUp(!isSignUp); setMessage(""); }}
            style={{ background: "none", border: "none", color: C.textMuted, fontSize: 13, cursor: "pointer", padding: "8px", transition: "color 0.15s" }}
            onMouseEnter={(e) => e.target.style.color = C.accent}
            onMouseLeave={(e) => e.target.style.color = C.textMuted}
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
