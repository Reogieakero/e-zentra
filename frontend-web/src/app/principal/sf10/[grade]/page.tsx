import { Suspense } from "react";
import { Sf10ScopePage, Sf10ScopePageLoading } from "@/components/sf10/sf10-scope-page";

export default function Sf10GradePage({ params }: { params: Promise<{ grade: string }> }) {
  return (
    <Suspense fallback={<Sf10ScopePageLoading />}>
      {params.then(({ grade }) => (
        <Sf10ScopePage grade={grade} />
      ))}
    </Suspense>
  );
}