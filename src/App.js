import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import FlowList from "./FlowList";
import Auth from "./Auth";
import Onboarding from "./Onboarding";

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) await fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) await fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data || null);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#FDF8F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @keyframes spinTwinkle {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(90deg) scale(1.08); }
          50% { transform: rotate(180deg) scale(1); }
          75% { transform: rotate(270deg) scale(1.08); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes colorShift {
          0% { background: #A85C42; }
          25% { background: #C4735A; }
          50% { background: #D4956E; }
          75% { background: #B87A5A; }
          100% { background: #A85C42; }
        }
      `}</style>
      <div style={{ width: 52, height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#fff", animation: "spinTwinkle 4s ease-in-out infinite, colorShift 6s ease-in-out infinite" }}>✦</div>
    </div>
  );

  if (!session) return <Auth />;
  if (!profile?.display_name) return (
    <Onboarding
      session={session}
      onComplete={(newProfile) => setProfile(newProfile)}
    />
  );

  return <FlowList session={session} profile={profile} />;
}

export default App;
