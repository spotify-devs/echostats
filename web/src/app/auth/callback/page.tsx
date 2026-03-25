"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Music, Loader2, CheckCircle, XCircle } from "lucide-react";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if redirected back with success (from API redirect)
    const statusParam = searchParams.get("status");
    if (statusParam === "success") {
      setStatus("success");
      // Notify opener if popup
      if (window.opener) {
        window.opener.postMessage({ type: "spotify-auth-success" }, "*");
        setTimeout(() => window.close(), 1000);
      } else {
        setTimeout(() => router.push("/dashboard"), 1500);
      }
      return;
    }

    // Legacy flow: exchange code directly (if code is present)
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setStatus("error");
      setError(errorParam);
      if (window.opener) {
        window.opener.postMessage({ type: "spotify-auth-error", error: errorParam }, "*");
      }
      return;
    }

    if (!code && !state) {
      // No code or status — just show success (likely redirected from API)
      setStatus("success");
      if (window.opener) {
        window.opener.postMessage({ type: "spotify-auth-success" }, "*");
        setTimeout(() => window.close(), 1000);
      } else {
        setTimeout(() => router.push("/dashboard"), 1500);
      }
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setError("Missing authorization code");
      return;
    }

    // Exchange code via our API
    fetch(`/api/v1/auth/callback?code=${code}&state=${state}`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || "Authentication failed");
        }
        return res.json();
      })
      .then(() => {
        setStatus("success");
        // If opened as popup, notify parent window
        if (window.opener) {
          window.opener.postMessage({ type: "spotify-auth-success" }, "*");
          setTimeout(() => window.close(), 1000);
        } else {
          setTimeout(() => router.push("/dashboard"), 1500);
        }
      })
      .catch((err) => {
        setStatus("error");
        setError(err.message);
        if (window.opener) {
          window.opener.postMessage({ type: "spotify-auth-error", error: err.message }, "*");
        }
      });
  }, [searchParams, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="glass-card p-12 max-w-sm w-full text-center space-y-6 animate-fade-in">
        <div className="p-4 rounded-2xl bg-accent-gradient inline-block shadow-glow">
          <Music className="w-8 h-8 text-white" />
        </div>

        {status === "loading" && (
          <>
            <Loader2 className="w-8 h-8 text-accent-purple animate-spin mx-auto" />
            <p className="text-white/60">Connecting to Spotify...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-10 h-10 text-spotify-green mx-auto" />
            <p className="text-white font-medium">Connected successfully!</p>
            <p className="text-sm text-white/40">Redirecting to dashboard...</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-10 h-10 text-red-400 mx-auto" />
            <p className="text-white font-medium">Authentication Failed</p>
            <p className="text-sm text-white/40">{error}</p>
            <a href="/" className="btn-primary inline-block text-sm">
              Try Again
            </a>
          </>
        )}
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-surface">
          <Loader2 className="w-8 h-8 text-accent-purple animate-spin" />
        </main>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
