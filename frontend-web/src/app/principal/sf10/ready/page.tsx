import { Suspense } from "react";
import { Sf10StatusPage, Sf10StatusPageLoading } from "@/components/sf10/sf10-status-page";

export default function Sf10ReadyPage() {
  return (
    <Suspense fallback={<Sf10StatusPageLoading />}>
      <Sf10StatusPage
        status="ready"
        title="Ready SF10"
        subtitle="Learner SF10 files marked ready for release."
      />
    </Suspense>
  );
}
