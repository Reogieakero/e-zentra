import { Suspense } from "react";
import AuthCallbackClient from "./callback-client";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div aria-hidden />}>
      <AuthCallbackClient />
    </Suspense>
  );
}
