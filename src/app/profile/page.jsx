"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../components/AuthProvider";

const avatars = ["/img/defaultpp1.jpg", "/img/defaultpp2.jpg", "/img/defaultpp3.jpg"];

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, client } = useAuth();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(avatars[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (!user || !client) return;
    let active = true;
    client.from("profiles").select("display_name,avatar_url").eq("user_id", user.id).maybeSingle()
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) {
          setError(queryError.message);
          return;
        }
        setName(
          data?.display_name ||
          user.user_metadata?.display_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          "",
        );
        setAvatar(data?.avatar_url || avatars[0]);
      })
      .catch((queryError) => {
        if (active) setError(queryError.message || "Could not load your profile.");
      });
    return () => { active = false; };
  }, [client, user]);

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    const { error: saveError } = await client.from("profiles").upsert({
      user_id: user.id,
      display_name: name.trim(),
      avatar_url: avatar,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (saveError) setError(saveError.message);
    else setMessage("Your profile is up to date.");
  }

  async function signOut() {
    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) setError(signOutError.message);
    else router.push("/");
  }

  if (loading || !user) return <main className="page-shell loading-state">Loading your account…</main>;

  return (
    <main className="auth-page profile-page">
      <section className="auth-card profile-card">
        <p className="eyebrow">YOUR SPACE</p>
        <h1>Make it yours.</h1>
        <p className="auth-lede">{user.email}</p>
        <form className="auth-form" onSubmit={saveProfile}>
          <fieldset className="avatar-picker">
            <legend>Pick a profile image</legend>
            {avatars.map((image) => (
              <button
                type="button"
                key={image}
                aria-label={`Choose avatar ${avatars.indexOf(image) + 1}`}
                aria-pressed={avatar === image}
                className={`avatar-option${avatar === image ? " selected" : ""}`}
                onClick={() => setAvatar(image)}
              >
                <img src={image} alt="" />
              </button>
            ))}
          </fieldset>
          <label>
            Display name
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} required />
          </label>
          {error && <p className="form-message error-message" role="alert">{error}</p>}
          {message && <p className="form-message success-message" role="status">{message}</p>}
          <button className="button button-dark auth-submit" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
        </form>
        <button className="sign-out-button" type="button" onClick={signOut}>Sign out</button>
        <Link className="text-link" href="/shop">Back to the shop <span>↗</span></Link>
      </section>
    </main>
  );
}
