"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type ApiResponse = {
  ok?: boolean;
  error?: string;
  data?: {
    next?: string;
  };
};

export function GoogleCallbackHandler() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function finishGoogleSignIn() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !sessionData.session?.access_token) {
          throw new Error("We could not complete Google sign-in. Please try again.");
        }

        const response = await fetch("/api/auth/google/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            accessToken: sessionData.session.access_token
          })
        });

        const data = (await response.json()) as ApiResponse;

        await supabase.auth.signOut();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to finish Google sign-in.");
        }

        if (!cancelled) {
          router.replace(data.data?.next ?? "/dashboard");
          router.refresh();
        }
      } catch (error) {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : "Unable to continue with Google.");
        }
      }
    }

    void finishGoogleSignIn();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="panel-stack auth-form auth-form--login">
      {error ? (
        <div className="message message-error">{error}</div>
      ) : (
        <div className="message message-success">
          Completing your Google sign-in. Please wait...
        </div>
      )}
    </div>
  );
}
