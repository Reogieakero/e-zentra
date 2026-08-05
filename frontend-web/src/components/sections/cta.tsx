import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./cta.module.css";

export function Cta() {
  return (
    <section className={styles.section} id="contact">
      <div className={styles.container}>
        <div className={styles.banner}>
          <div className={styles.dotGrid} />
          <div className={styles.bannerInner}>
            <div className={styles.copy}>
              <h3 className={styles.title}>See Zentra with your own school&apos;s workflow</h3>
              <p className={styles.lede}>
                We&apos;ll walk through attendance, SF10, anecdotal records, and the ADM approval
                flow with your team.
              </p>
            </div>
            <div className={styles.actions}>
              <Button href="mailto:hello@zentra.app" variant="light">
                <Mail size={16} />
                Request a Demo
              </Button>
              <Button href="/login" variant="outlineLight">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}