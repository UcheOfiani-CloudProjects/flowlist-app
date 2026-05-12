import { useState } from "react";
import { supabase } from "./supabaseClient";

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
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
      <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 28, padding: 36, width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: "#fff", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 16px" }}>✦</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em" }}>FlowList</h1>
          <p style={{ fontSize: 13, color: "#555", marginTop: 6 }}>{isSignUp ? "Create your account" : "Welcome back"}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: 14, padding: "14px 18px", color: "#fff", fontSize: 14, outline: "none" }}
            onFocus={(e) => e.target.style.borderColor = "#444"}
            onBlur={(e) => e.target.style.borderColor = "#2a2a2a"}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            style={{ background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: 14, padding: "14px 18px", color: "#fff", fontSize: 14, outline: "none" }}
            onFocus={(e) => e.target.style.borderColor = "#444"}
            onBlur={(e) => e.target.style.borderColor = "#2a2a2a"}
          />

          {message && (
            <p style={{ fontSize: 13, color: message.includes("Check") ? "#4a9a4a" : "#e07070", textAlign: "center" }}>{message}</p>
          )}

          <button
            onClick={handleAuth}
            disabled={loading}
            style={{ background: "#fff", color: "#000", fontWeight: 600, fontSize: 15, padding: "14px", borderRadius: 14, border: "none", cursor: "pointer", opacity: loading ? 0.7 : 1, marginTop: 4 }}
          >
            {loading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
          </button>

          <button
            onClick={() => { setIsSignUp(!isSignUp); setMessage(""); }}
            style={{ background: "none", border: "none", color: "#555", fontSize: 13, cursor: "pointer", padding: "8px" }}
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
