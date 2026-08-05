"use client";

import { ChevronDown } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import styles from "./faq.module.css";

const FAQS = [
  {
    question: "Does Zentra replace our paper forms entirely?",
    answer:
      "Zentra digitizes the same forms your school already uses — GCForm-01, GCForm-12, SF10, and the ADM Learner's Profile — so the workflow stays familiar, just faster and harder to lose.",
  },
  {
    question: "Who can see a student's confidential records?",
    answer:
      "Access is scoped by role. For example, the Principal sees that an ADM or health case exists and its progress, but not the confidential notes behind it — that detail stays with Guidance, the Nurse, or the ADM Coordinator.",
  },
  {
    question: 'How is a student flagged as "at risk"?',
    answer:
      "Zentra checks three axes in real time — an overall average below 75, an attendance rate below 80%, and any logged behavioral incident — aligned with DepEd Order No. 8, s. 2015.",
  },
  {
    question: "Can parents and students see risk status directly?",
    answer:
      "Yes. Students and parents see the risk classification and which category it falls under, without exposing the private write-up behind a behavioral flag.",
  },
  {
    question: "Does it work without reliable internet?",
    answer:
      "The mobile app is offline-first — advisers can keep logging attendance and notes without a signal, and everything syncs automatically once they're back online.",
  },
  {
    question: "How are staff accounts created?",
    answer:
      "Students, parents, and teachers register through dedicated pages tied to their role. Staff positions such as Registrar, Record Keeper, Nurse, ADM Coordinator, Guidance Counselor, and Principal are provisioned directly, one account per position.",
  },
];

export function Faq() {
  return (
    <section className={styles.section} id="faq">
      <div className={styles.container}>
        <SectionHeading eyebrow="FAQ" title="Common questions" />

        <div className={styles.list}>
          {FAQS.map((faq, i) => (
            <details key={faq.question} className={styles.item} open={i === 0}>
              <summary className={styles.summary}>
                <span>{faq.question}</span>
                <ChevronDown size={16} className={styles.chevron} />
              </summary>
              <p className={styles.answer}>{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}