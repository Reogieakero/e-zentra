import { Suspense } from "react";
import { Sf10StatusPage, Sf10StatusPageLoading } from "@/components/sf10/sf10-status-page";

export default function Sf10MissingPage() {
  return (
    <Suspense fallback={<Sf10StatusPageLoading />}>
      <Sf10StatusPage
        status="missing"
        title="Missing SF10"
        subtitle="Learners with no SF10 file attached yet."
      />
    </Suspense>
  );
}
