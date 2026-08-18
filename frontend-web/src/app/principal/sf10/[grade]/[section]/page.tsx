import { Suspense } from "react";
import { Sf10ScopePage, Sf10ScopePageLoading } from "@/components/sf10/sf10-scope-page";

export default function Sf10SectionPage({
  params,
}: {
  params: Promise<{ grade: string; section: string }>;
}) {
  return (
    <Suspense fallback={<Sf10ScopePageLoading />}>
      {params.then(({ grade, section }) => (
        <Sf10ScopePage grade={grade} section={section} />
      ))}
    </Suspense>
  );
}