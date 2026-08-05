import { FolderX, Clock, Users, CheckCircle2, LucideIcon } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import styles from "./problem.module.css";

interface ProblemItem {
  icon: LucideIcon;
  text: string;
  iconClass: string;
  iconWrapClass: string;
}

const ITEMS: ProblemItem[] = [
  {
    icon: FolderX,
    text: "Paper GCForm-01s, SF10s, and referral slips scattered across offices",
    iconWrapClass: "wrapRed",
    iconClass: "iconRed",
  },
  {
    icon: Clock,
    text: "At-risk students noticed weeks after grades or attendance already slipped",
    iconWrapClass: "wrapAmber",
    iconClass: "iconAmber",
  },
  {
    icon: Users,
    text: "Parents left out of the loop until a card is handed home at the quarter's end",
    iconWrapClass: "wrapSky",
    iconClass: "iconSky",
  },
  {
    icon: CheckCircle2,
    text: "Zentra keeps every record digital, current, and visible to the right role",
    iconWrapClass: "wrapBrand",
    iconClass: "iconBrand",
  },
];

export function Problem() {
  return (
    <section className={`${styles.section} ${styles.muted}`}>
      <div className={styles.container}>
        <SectionHeading
          eyebrow="The Problem"
          title="The paperwork isn't the hard part. Losing track is."
        />
        <div className={styles.grid}>
          {ITEMS.map((item) => {
            const ItemIcon = item.icon;
            return (
              <div key={item.text} className={styles.item}>
                <div className={`${styles.iconWrap} ${styles[item.iconWrapClass]}`}>
                  <ItemIcon size={16} className={styles[item.iconClass]} />
                </div>
                <p className={styles.text}>{item.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}