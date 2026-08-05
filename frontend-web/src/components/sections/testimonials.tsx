import { Star } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import styles from "./testimonials.module.css";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Attendance used to eat up my first ten minutes with a logbook. Now it's two taps before the bell even settles, and I can already see who's slipping by Friday.",
    name: "Mr. Ramon Cruz",
    role: "Class Adviser, Grade 7",
  },
  {
    quote:
      "Every ADM case used to live in my head and a folder. Now the certification, the home visitation, everything is attached to one file the Principal can open the moment I submit it.",
    name: "Ms. Bea Alonzo",
    role: "ADM Coordinator",
  },
  {
    quote:
      "I approve or send a case back for follow-up in the same afternoon it reaches me, with the full history in front of me. No more chasing a folder across three offices.",
    name: "Elena Vance",
    role: "School Principal",
  },
];

export function Testimonials() {
  return (
    <section className={styles.section} id="testimonials">
      <div className={styles.container}>
        <SectionHeading
          eyebrow="Testimonials"
          title="What it feels like day to day"
          description="Illustrative feedback from the roles Zentra is built for."
        />

        <div className={styles.grid}>
          {TESTIMONIALS.map((item, i) => (
            <Reveal key={item.name} delay={i * 80}>
              <figure className={styles.card}>
                <div className={styles.stars}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} size={14} className={styles.star} />
                  ))}
                </div>
                <blockquote className={styles.quote}>{item.quote}</blockquote>
                <figcaption className={styles.author}>
                  <div className={styles.authorName}>{item.name}</div>
                  <div className={styles.authorRole}>{item.role}</div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}