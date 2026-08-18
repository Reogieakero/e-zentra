"use client";

import type { Sf10Section } from "@/lib/dashboard";
import { Modal } from "@/components/ui/modal";
import { AnimatedFolder } from "@/components/ui/animated-folder";
import styles from "./sf10-sections-modal.module.css";

interface Sf10SectionsModalProps {
  open: boolean;
  gradeLabel: string;
  sections: Sf10Section[];
  onSelect: (sectionId: string) => void;
  onClose: () => void;
}

export function Sf10SectionsModal({
  open,
  gradeLabel,
  sections,
  onSelect,
  onClose,
}: Sf10SectionsModalProps) {
  const total = sections.reduce((sum, s) => sum + s.count, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${gradeLabel} Sections`}
      subtitle="Select a section to view its SF10 records"
      size="lg"
    >
      <div className={styles.folderGrid}>
        <AnimatedFolder
          label="All Sections"
          count={total}
          onClick={() => onSelect("all")}
          title={`${gradeLabel} - all sections`}
        />
        {sections.map((s) => (
          <AnimatedFolder
            key={s.sectionId}
            label={s.sectionName}
            count={s.count}
            onClick={() => onSelect(s.sectionId)}
            title={`${gradeLabel} - ${s.sectionName}`}
          />
        ))}
      </div>
    </Modal>
  );
}