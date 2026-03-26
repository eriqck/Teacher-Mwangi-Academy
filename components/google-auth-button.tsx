"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function GoogleAuthButton({ mode }: { mode: "login" | "signup" }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    try {
      setLoading(true);
      setError("");

      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/google/callback`;
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account"
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      setLoading(false);
      setError(error instanceof Error ? error.message : "Unable to start Google sign-in.");
    }
  }

  return (
    <div className="auth-oauth-stack">
      <div className="auth-divider">
        <span>or</span>
      </div>
      <button
        type="button"
        className="button-secondary button-google"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        {loading
          ? "Connecting to Google..."
          : mode === "signup"
            ? "Continue with Google"
            : "Sign in with Google"}
      </button>
      {error ? <div className="message message-error">{error}</div> : null}
    </div>
  );
}
