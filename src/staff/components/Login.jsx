import { useState } from "react";
import { supabase, shopName } from "../../lib/supabase";

export default function Login() {
  const [mode, setMode] = useState("pin"); // "pin" | "email"
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submitPin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { data, error: err } = await supabase.functions.invoke("staff-pin-login", { body: { pin } });
    if (err || !data?.access_token) {
      setBusy(false);
      setPin("");
      setError(err?.context?.status === 429 ? "Too many tries. Please wait a few minutes." : "That PIN is not right.");
      return;
    }
    // App.jsx's onAuthStateChange picks the new session up and opens the dashboard.
    await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
    setBusy(false);
  };

  const submitEmail = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError("That email or password is not right.");
  };

  return (
    <div className="login">
      <h1>{shopName}</h1>
      <p className="sub">Staff sign in</p>

      {mode === "pin" ? (
        <form className="form" onSubmit={submitPin}>
          <label>
            Staff PIN
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={12}
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              required
            />
          </label>
          <p className="err">{error}</p>
          <button className={"cta" + (busy ? " busy" : "")} style={{ marginTop: 8 }} disabled={busy || !pin} type="submit">
            <span>{busy ? "Signing in" : "Sign in"}</span>
          </button>
          <button type="button" className="ghost" onClick={() => { setMode("email"); setError(""); }}>
            Use email and password instead
          </button>
        </form>
      ) : (
        <form className="form" onSubmit={submitEmail}>
          <label>
            Email
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <p className="err">{error}</p>
          <button className={"cta" + (busy ? " busy" : "")} style={{ marginTop: 8 }} disabled={busy} type="submit">
            <span>{busy ? "Signing in" : "Sign in"}</span>
          </button>
          <button type="button" className="ghost" onClick={() => { setMode("pin"); setError(""); }}>
            Use PIN instead
          </button>
        </form>
      )}
    </div>
  );
}