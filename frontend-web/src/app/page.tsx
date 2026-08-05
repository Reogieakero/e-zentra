import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.navInner}>
          <div className={styles.brand}>
            <div className={styles.brandMark}>Z</div>
            <span>Zentra</span>
          </div>
          <nav className={styles.nav}>
            <a href="#features">Features</a>
            <a href="#modules">Modules</a>
          </nav>
          <a className={styles.loginLink} href="/login">
            Sign in
          </a>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.overline}>School Information System</p>
          <h1 className={styles.title}>
            Records, grades, and oversight — in one place.
          </h1>
          <p className={styles.lede}>
            Zentra connects students, parents, teachers, and school staff around
            a single source of truth for academic records, attendance, grading,
            and learner support.
          </p>
          <div className={styles.ctas}>
            <a className={styles.primary} href="/login">
              Sign in
            </a>
            <a className={styles.secondary} href="#features">
              Learn more
            </a>
          </div>
        </div>
      </section>

      <section className={styles.section} id="features">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={styles.overline}>01 · Overview</p>
            <h2>Everything a school needs to run on one record</h2>
          </div>
          <div className={styles.grid3}>
            <div className={styles.card}>
              <h3>Grades &amp; report cards</h3>
              <p>
                DepEd transmutation, final-grade workflow, and report cards
                generated from verified grades — including scanned-card OCR.
              </p>
            </div>
            <div className={styles.card}>
              <h3>Attendance &amp; alerts</h3>
              <p>
                Per-section daily records that notify confirmed parents the
                moment a learner is marked absent or late.
              </p>
            </div>
            <div className={styles.card}>
              <h3>Risk detection</h3>
              <p>
                A transparent, rule-based assessment flags at-risk learners from
                academic, attendance, and behavioral signals.
              </p>
            </div>
            <div className={styles.card}>
              <h3>Learner support</h3>
              <p>
                Anecdotal records, referrals, follow-ups, health records, and
                home visits in one guidance workflow.
              </p>
            </div>
            <div className={styles.card}>
              <h3>Records oversight</h3>
              <p>
                Grade-band ownership, audit trails, record flags, and automatic
                escalation keep the ledger accountable.
              </p>
            </div>
            <div className={styles.card}>
              <h3>Family access</h3>
              <p>
                Confirmed parent links unlock read access to a child&apos;s
                attendance, grades, and notifications.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footInner}>
            <span>Zentra — School Information System</span>
            <span>Frontend under construction · Backend API live</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
