"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Sparkles } from "lucide-react";
import { sileo } from "sileo";
import { googleSignIn } from "@/lib/supabase";
import { clearGoogleIdentity, getGoogleIdentity, type GoogleIdentity } from "@/lib/google";
import { SignupForm } from "./signup-form";
import { GoogleSignupForm } from "./google-signup-form";
import { GoogleIcon } from "./google-icon";
import styles from "./signup-methods.module.css";

type SignupMethod = "manual" | "google";

export function SignupMethods() {
  const searchParams = useSearchParams();
  const initialMethod: SignupMethod = useMemo(
    () => (searchParams.get("method") === "google" ? "google" : "manual"),
    [searchParams]
  );
  const [method, setMethod] = useState<SignupMethod>(initialMethod);
  const [identity, setIdentity] = useState<GoogleIdentity | null>(() => getGoogleIdentity());

  async function startGoogleSignup() {
    try {
      await googleSignIn({ mode: "signup" });
    } catch (err) {
      sileo.error({
        title: "Google sign-up failed",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
    }
  }

  function handleGoogleComplete() {
    clearGoogleIdentity();
    setIdentity(null);
  }

  return (
    <>
      <div className={styles.methodTabs} role="tablist" aria-label="Sign up method">
        <button
          type="button"
          role="tab"
          aria-selected={method === "manual"}
          className={`${styles.methodTab} ${method === "manual" ? styles.methodTabActive : ""}`}
          onClick={() => setMethod("manual")}
        >
          <FileText size={16} />
          <span>Manual form</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={method === "google"}
          className={`${styles.methodTab} ${method === "google" ? styles.methodTabActive : ""}`}
          onClick={() => setMethod("google")}
        >
          <Sparkles size={16} />
          <span>Sign up with Google</span>
        </button>
      </div>

      {method === "manual" ? (
        <SignupForm />
      ) : identity ? (
        <GoogleSignupForm identity={identity} onComplete={handleGoogleComplete} />
      ) : (
        <div className={styles.googleCta}>
          <button type="button" className={styles.googleBtn} onClick={startGoogleSignup}>
            <GoogleIcon size={18} />
            Sign up with Google
          </button>
          <p className={styles.googleHint}>
            You&apos;ll pick a Google account, then complete your profile to finish creating your account.
          </p>
        </div>
      )}
    </>
  );
}