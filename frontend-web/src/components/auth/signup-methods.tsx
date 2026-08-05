"use client";

import { useState } from "react";
import { sileo } from "sileo";
import { googleSignIn } from "@/lib/supabase";
import { clearGoogleIdentity, getGoogleIdentity, type GoogleIdentity } from "@/lib/google";
import { SignupForm } from "./signup-form";
import { GoogleSignupForm } from "./google-signup-form";
import { GoogleIcon } from "./google-icon";
import formStyles from "./auth-form.module.css";
import styles from "./signup-methods.module.css";

export function SignupMethods() {
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

  if (identity) {
    return <GoogleSignupForm identity={identity} onComplete={handleGoogleComplete} />;
  }

  return (
    <>
      <SignupForm />

      <div className={formStyles.divider}>
        <div className={formStyles.dividerLine} />
        <span className={formStyles.dividerText}>or</span>
        <div className={formStyles.dividerLine} />
      </div>

      <button type="button" className={formStyles.google} onClick={startGoogleSignup}>
        <GoogleIcon size={18} />
        Sign up with Google
      </button>

      <p className={styles.googleHint}>
        You&apos;ll pick a Google account, then complete your profile to finish creating your account.
      </p>
    </>
  );
}
