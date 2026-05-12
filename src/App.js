import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import FlowList from "./FlowList";
import Auth from "./Auth";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 20, height: 20, border: "2px solid #333", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );

  return session ? <FlowList session={session} /> : <Auth />;
}

export default App;