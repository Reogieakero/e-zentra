"use client";

import { useRouter } from "next/navigation";
import { useSf10Summary } from "@/lib/dashboard";
import { Sf10Header, Sf10HeaderLoading } from "@/components/sf10/sf10-header";
import { Sf10Overview, Sf10OverviewLoading } from "@/components/sf10/sf10-overview";
import { Sf10AuditTrail, Sf10AuditTrailLoading } from "@/components/sf10/sf10-audit-trail";
import { Sf10SectionsModal } from "@/components/sf10/sf10-sections-modal";
import { Sf10PageError } from "@/components/sf10/sf10-states";
import { useMemo, useState } from "react";
import styles from "@/components/sf10/sf10-page.module.css";

export default function Sf10Page() {
  const router = useRouter();
  const [openSectionsFor, setOpenSectionsFor] = useState<string | null>(null);

  const { data, error, refresh } = useSf10Summary({ sort: "last_updated", page: 1, pageSize: 12 });

  const activeFolder = useMemo(
    () => (data?.folders ?? []).find((f) => f.gradeLevel === openSectionsFor) ?? null,
    [data, openSectionsFor]
  );

  const openSections = (sectionId: string) => {
    if (!activeFolder || !data) return;
    setOpenSectionsFor(null);
    if (sectionId === "all") {
      router.push(`/principal/sf10/${activeFolder.gradeLevel}`);
      return;
    }
    const section = data.sections.find(
      (s) => s.sectionId === sectionId && s.gradeLevel === activeFolder.gradeLevel
    );
    if (section) {
      router.push(`/principal/sf10/${activeFolder.gradeLevel}/${encodeURIComponent(section.sectionName)}`);
    }
  };

  const loading = !data && !error;

  if (loading) {
    return (
      <div className={styles.page}>
        <Sf10HeaderLoading />
        <Sf10OverviewLoading />
        <Sf10AuditTrailLoading />
      </div>
    );
  }

  if (error || !data) {
    return <Sf10PageError error={error} onRetry={refresh} />;
  }

  return (
    <div className={styles.page}>
      <Sf10Header />

      <Sf10Overview
        folders={data.folders}
        counts={data.counts}
        readyList={data.readyList}
        missingList={data.missingList}
        schoolYear={data.schoolYear}
        onGradeClick={(g) => setOpenSectionsFor(g)}
        onShowReady={() => router.push("/principal/sf10/ready")}
        onShowMissing={() => router.push("/principal/sf10/missing")}
      />

      <Sf10AuditTrail />

      {activeFolder && (
        <Sf10SectionsModal
          open={!!openSectionsFor}
          gradeLabel={activeFolder.label}
          sections={data.sections.filter((s) => s.gradeLevel === activeFolder.gradeLevel)}
          onSelect={openSections}
          onClose={() => setOpenSectionsFor(null)}
        />
      )}
    </div>
  );
}
