"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../../components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { client } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!client) {
      setError("Supabase isn’t configured. Add the public project URL and key to .env.local.");
      return;
    }
    setSending(true);
    try {
      if (mode === "signup") {
        const { data, error: authError } = await client.auth.signUp({
          email,
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (authError) throw authError;
        if (data.session) router.push("/profile");
        else setMessage("Account created. Check your email to confirm your address, then sign in.");
      } else {
        const { error: authError } = await client.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        router.push("/profile");
      }
    } catch (authError) {
      setError(authError.message || "We couldn’t complete that request.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">WELCOME TO RONGKUSHOL</p>
        <h1>{mode === "login" ? "Good to see you." : "Make yourself at home."}</h1>
        <p className="auth-lede">{mode === "login" ? "Sign in to share a review and manage your profile." : "Create an account to make the good stuff yours."}</p>
        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && (
            <label>
              Name
              <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={60} />
            </label>
          )}
          <label>
            Email
            <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
          </label>
          {error && <p className="form-message error-message" role="alert">{error}</p>}
          {message && <p className="form-message success-message" role="status">{message}</p>}
          <button className="button button-dark auth-submit" type="submit" disabled={sending}>
            {sending ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="auth-switch">
          {mode === "login" ? "New around here?" : "Already have an account?"}{" "}
          <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}>
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
        <Link className="text-link" href="/shop">Continue browsing <span>↗</span></Link>
      </section>
    </main>
  );
}
