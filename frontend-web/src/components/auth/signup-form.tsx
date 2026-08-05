"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GraduationCap, Presentation, Users } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import type { RegisterResponse } from "@/lib/auth";
import styles from "./signup-form.module.css";

type SignupRole = "student" | "parent" | "teacher";

const GRADE_LEVELS = [
  { value: "grade_7", label: "Grade 7" },
  { value: "grade_8", label: "Grade 8" },
  { value: "grade_9", label: "Grade 9" },
  { value: "grade_10", label: "Grade 10" },
  { value: "grade_11", label: "Grade 11" },
  { value: "grade_12", label: "Grade 12" },
];

const RELATIONSHIPS = [
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "guardian", label: "Guardian" },
];

const TABS: { role: SignupRole; icon: typeof GraduationCap; label: string }[] = [
  { role: "student", icon: GraduationCap, label: "Student" },
  { role: "parent", icon: Users, label: "Parent" },
  { role: "teacher", icon: Presentation, label: "Teacher" },
];

export function SignupForm() {
  const router = useRouter();
  const [role, setRole] = useState<SignupRole>("student");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const base = {
      email: values.email ?? "",
      password: values.password ?? "",
      firstName: values.firstName ?? "",
      middleName: values.middleName ?? "",
      lastName: values.lastName ?? "",
      suffix: values.suffix ?? "",
      contactNumber: values.contactNumber ?? "",
    };

    let body: Record<string, unknown>;
    let endpoint: string;

    if (role === "student") {
      endpoint = "/auth/register/student";
      body = {
        ...base,
        lrn: values.lrn ?? "",
        birthdate: values.birthdate ?? "",
        sex: values.sex ?? "male",
        gradeLevel: values.gradeLevel ?? "grade_7",
        address: values.address ?? "",
      };
    } else if (role === "parent") {
      endpoint = "/auth/register/parent";
      body = {
        ...base,
        relationship: values.relationship ?? "guardian",
        occupation: values.occupation ?? "",
        address: values.address ?? "",
        childEmail: values.childEmail ?? "",
        childLrn: values.childLrn ?? "",
      };
      if (!values.childEmail && !values.childLrn) {
        delete (body as { childEmail?: string }).childEmail;
        delete (body as { childLrn?: string }).childLrn;
      }
    } else {
      endpoint = "/auth/register/teacher";
      body = {
        ...base,
        employeeId: values.employeeId ?? "",
        department: values.department ?? "",
        dateHired: values.dateHired ?? "",
      };
      if (!values.dateHired) delete (body as { dateHired?: string }).dateHired;
    }

    try {
      await api<{ data: RegisterResponse }>(endpoint, { method: "POST", body });
      setSuccess("Your registration was submitted. A school administrator will review and approve your account.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className={styles.tabs} role="tablist">
        {TABS.map(({ role: r, icon: Icon, label }) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={role === r}
            className={`${styles.tabBtn} ${role === r ? styles.tabBtnActive : ""}`}
            onClick={() => setRole(r)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.nameRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="firstName">
              First name
            </label>
            <input id="firstName" className={styles.input} required value={values.firstName ?? ""} onChange={(e) => setValue("firstName", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="lastName">
              Last name
            </label>
            <input id="lastName" className={styles.input} required value={values.lastName ?? ""} onChange={(e) => setValue("lastName", e.target.value)} />
          </div>
        </div>

        {role === "student" ? (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="lrn">Learner Reference Number (LRN)</label>
              <input id="lrn" className={styles.input} required value={values.lrn ?? ""} onChange={(e) => setValue("lrn", e.target.value)} />
            </div>
            <div className={styles.nameRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="gradeLevel">Grade level</label>
                <select id="gradeLevel" className={styles.input} value={values.gradeLevel ?? "grade_7"} onChange={(e) => setValue("gradeLevel", e.target.value)}>
                  {GRADE_LEVELS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="sex">Sex</label>
                <select id="sex" className={styles.input} value={values.sex ?? "male"} onChange={(e) => setValue("sex", e.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="birthdate">Birthdate</label>
              <input id="birthdate" type="date" className={styles.input} required value={values.birthdate ?? ""} onChange={(e) => setValue("birthdate", e.target.value)} />
            </div>
          </>
        ) : null}

        {role === "parent" ? (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="relationship">Relationship to student</label>
              <select id="relationship" className={styles.input} value={values.relationship ?? "guardian"} onChange={(e) => setValue("relationship", e.target.value)}>
                {RELATIONSHIPS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="childEmail">Child&apos;s email <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(optional if you know their LRN)</span></label>
              <input id="childEmail" type="email" className={styles.input} value={values.childEmail ?? ""} onChange={(e) => setValue("childEmail", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="childLrn">Child&apos;s LRN <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(optional if you know their email)</span></label>
              <input id="childLrn" className={styles.input} value={values.childLrn ?? ""} onChange={(e) => setValue("childLrn", e.target.value)} />
            </div>
          </>
        ) : null}

        {role === "teacher" ? (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="employeeId">Employee ID</label>
              <input id="employeeId" className={styles.input} required value={values.employeeId ?? ""} onChange={(e) => setValue("employeeId", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="department">Department <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(optional)</span></label>
              <input id="department" className={styles.input} value={values.department ?? ""} onChange={(e) => setValue("department", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="dateHired">Date hired <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(optional)</span></label>
              <input id="dateHired" type="date" className={styles.input} value={values.dateHired ?? ""} onChange={(e) => setValue("dateHired", e.target.value)} />
            </div>
          </>
        ) : null}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">Email</label>
          <input id="email" type="email" className={styles.input} required value={values.email ?? ""} onChange={(e) => setValue("email", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">Password <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(min 8 characters)</span></label>
          <input id="password" type="password" className={styles.input} required minLength={8} value={values.password ?? ""} onChange={(e) => setValue("password", e.target.value)} />
        </div>

        {error ? (
          <div className={`${styles.error} ${styles.errorVisible}`} role="alert">{error}</div>
        ) : null}
        {success ? <div className={styles.success}>{success}</div> : null}

        <button type="submit" className={styles.submitBtn} disabled={submitting}>
          {submitting ? <span className={styles.spinner} /> : `Create ${role} account`}
        </button>
      </form>
    </>
  );
}