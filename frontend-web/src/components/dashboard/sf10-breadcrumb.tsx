"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSf10Summary } from "@/lib/dashboard";
import { Sf10SectionsModal } from "@/components/sf10/sf10-sections-modal";
import styles from "./topbar.module.css";

function gradeLabel(value: string): string {
  return value.startsWith("grade_") ? `Grade ${value.replace("grade_", "")}` : value;
}

interface Sf10BreadcrumbProps {
  pathname: string;
}

export function Sf10Breadcrumb({ pathname }: Sf10BreadcrumbProps) {
  const router = useRouter();
  const [openSectionsFor, setOpenSectionsFor] = useState<string | null>(null);

  const { data } = useSf10Summary({ sort: "last_updated", page: 1, pageSize: 12 });

  const tail = useMemo(() => {
    if (!pathname.startsWith("/principal/sf10")) return [];
    return pathname.replace("/principal/sf10", "").split("/").filter(Boolean);
  }, [pathname]);

  const isStatusView = tail[0] === "missing" || tail[0] === "ready";
  const grade = isStatusView ? null : (tail[0] ?? null);
  const section = isStatusView ? null : tail[1] ? decodeURIComponent(tail[1]) : null;

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
    const sectionRow = data.sections.find(
      (s) => s.sectionId === sectionId && s.gradeLevel === activeFolder.gradeLevel
    );
    if (sectionRow) {
      router.push(`/principal/sf10/${activeFolder.gradeLevel}/${encodeURIComponent(sectionRow.sectionName)}`);
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.crumbLink}
        onClick={() => router.push("/principal/sf10")}
        aria-label="Go to SF10 Records"
      >
        SF10 Records
      </button>
      {grade && (
        <>
          <span className={styles.separator}>/</span>
          <button
            type="button"
            className={styles.crumbLink}
            onClick={() => setOpenSectionsFor(grade)}
            aria-label={`Select ${gradeLabel(grade)} section`}
          >
            {gradeLabel(grade)}
          </button>
        </>
      )}
      {section && (
        <>
          <span className={styles.separator}>/</span>
          <span className={styles.crumbCurrent}>{section}</span>
        </>
      )}
      {isStatusView && (
        <>
          <span className={styles.separator}>/</span>
          <span className={styles.crumbCurrent}>{tail[0] === "missing" ? "Missing" : "Ready"}</span>
        </>
      )}

      {activeFolder && (
        <Sf10SectionsModal
          open={!!openSectionsFor}
          gradeLabel={activeFolder.label}
          sections={(data?.sections ?? []).filter((s) => s.gradeLevel === activeFolder.gradeLevel)}
          onSelect={openSections}
          onClose={() => setOpenSectionsFor(null)}
        />
      )}
    </>
  );
}
