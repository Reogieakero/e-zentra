"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GraduationCap, Presentation, UserPlus, Users } from "lucide-react";
import { sileo } from "sileo";
import { api, ApiClientError } from "@/lib/api";
import type { RegisterResponse } from "@/lib/auth";
import type { GoogleIdentity } from "@/lib/google";
import { CustomSelect, type SelectOption } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import styles from "./signup-form.module.css";
import gstyles from "./google-signup-form.module.css";

type SignupRole = "student" | "parent" | "teacher";

const GRADE_LEVELS: SelectOption[] = [
  { value: "grade_7", label: "Grade 7" },
  { value: "grade_8", label: "Grade 8" },
  { value: "grade_9", label: "Grade 9" },
  { value: "grade_10", label: "Grade 10" },
  { value: "grade_11", label: "Grade 11" },
  { value: "grade_12", label: "Grade 12" },
];

const RELATIONSHIPS: SelectOption[] = [
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "guardian", label: "Guardian" },
];

const SEXES: SelectOption[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const TABS: { role: SignupRole; icon: typeof GraduationCap; label: string }[] = [
  { role: "student", icon: GraduationCap, label: "Student" },
  { role: "parent", icon: Users, label: "Parent" },
  { role: "teacher", icon: Presentation, label: "Teacher" },
];

interface GoogleSignupFormProps {
  identity: GoogleIdentity;
  onComplete: () => void;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.split(" ").filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") || parts[0] || "",
  };
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function GoogleSignupForm({ identity, onComplete }: GoogleSignupFormProps) {
  const router = useRouter();
  const [role, setRole] = useState<SignupRole>("student");
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const name = splitName(identity.name);
    return { firstName: name.firstName, lastName: name.lastName };
  });

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function switchRole(next: SignupRole) {
    if (next === role) return;
    setRole(next);
    sileo.info({
      title: `Completing a ${next} profile`,
      description: next === "parent" ? "You can link your child using their email or LRN." : "Fill in the details below to finish your account.",
      icon: <UserPlus size={18} />,
    });
  }

  function handleLrnChange(value: string) {
    setValue("lrn", value.replace(/[^0-9]/g, "").slice(0, 12));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const base = {
      accessToken: identity.accessToken,
      firstName: values.firstName ?? "",
      middleName: values.middleName ?? "",
      lastName: values.lastName ?? "",
      suffix: values.suffix ?? "",
      contactNumber: values.contactNumber ?? "",
    };

    let body: Record<string, unknown>;

    if (role === "student") {
      body = {
        ...base,
        role: "student",
        lrn: values.lrn ?? "",
        birthdate: values.birthdate ?? "",
        sex: values.sex ?? "male",
        gradeLevel: values.gradeLevel ?? "grade_7",
        address: values.address ?? "",
      };
    } else if (role === "parent") {
      body = {
        ...base,
        role: "parent",
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
      body = {
        ...base,
        role: "teacher",
        employeeId: values.employeeId ?? "",
        department: values.department ?? "",
        dateHired: values.dateHired ?? "",
      };
      if (!values.dateHired) delete (body as { dateHired?: string }).dateHired;
    }

    try {
      await sileo.promise(
        api<{ data: RegisterResponse }>("/auth/oauth/google/register", { method: "POST", body }),
        {
          loading: {
            title: "Creating your account…",
            description: "Submitting your profile.",
          },
          success: {
            title: "Registration submitted!",
            description: "A school administrator will review and approve your account.",
            icon: <UserPlus size={18} />,
            button: {
              title: "Go to sign in",
              onClick: () => router.push("/login"),
            },
          },
          error: (err) => ({
            title: "Registration failed",
            description: err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.",
          }),
        }
      );
      onComplete();
    } catch {
      // sileo.promise already surfaced the error toast
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className={gstyles.identityCard}>
        <div className={gstyles.avatar}>
          {identity.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={identity.avatarUrl} alt="" width={40} height={40} />
          ) : (
            <span>{initials(identity.name)}</span>
          )}
        </div>
        <div className={gstyles.identityMeta}>
          <span className={gstyles.identityName}>{identity.name}</span>
          <span className={gstyles.identityEmail}>{identity.email}</span>
        </div>
      </div>

      <div className={styles.tabs} role="tablist">
        {TABS.map(({ role: r, icon: Icon, label }) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={role === r}
            className={`${styles.tabBtn} ${role === r ? styles.tabBtnActive : ""}`}
            onClick={() => switchRole(r)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.nameRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="googleFirstName">
              First name
            </label>
            <input id="googleFirstName" className={styles.input} required value={values.firstName ?? ""} onChange={(e) => setValue("firstName", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="googleLastName">
              Last name
            </label>
            <input id="googleLastName" className={styles.input} required value={values.lastName ?? ""} onChange={(e) => setValue("lastName", e.target.value)} />
          </div>
        </div>

        {role === "student" ? (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="googleLrn">Learner Reference Number (LRN)</label>
              <input
                id="googleLrn"
                className={styles.input}
                required
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={12}
                placeholder="12-digit LRN"
                value={values.lrn ?? ""}
                onChange={(e) => handleLrnChange(e.target.value)}
              />
            </div>
            <div className={styles.nameRow}>
              <CustomSelect
                id="googleGradeLevel"
                label="Grade level"
                value={values.gradeLevel ?? ""}
                options={GRADE_LEVELS}
                placeholder="Select grade"
                onChange={(v) => setValue("gradeLevel", v)}
              />
              <CustomSelect
                id="googleSex"
                label="Sex"
                value={values.sex ?? ""}
                options={SEXES}
                placeholder="Select sex"
                onChange={(v) => setValue("sex", v)}
              />
            </div>
            <DatePicker
              id="googleBirthdate"
              label="Birthdate"
              value={values.birthdate ?? ""}
              max={new Date().toISOString().slice(0, 10)}
              placeholder="Select birthdate"
              onChange={(v) => setValue("birthdate", v)}
            />
            <div className={styles.field}>
              <label className={styles.label} htmlFor="googleAddress">Address <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(optional)</span></label>
              <input id="googleAddress" className={styles.input} value={values.address ?? ""} onChange={(e) => setValue("address", e.target.value)} />
            </div>
          </>
        ) : null}

        {role === "parent" ? (
          <>
            <CustomSelect
              id="googleRelationship"
              label="Relationship to student"
              value={values.relationship ?? ""}
              options={RELATIONSHIPS}
              placeholder="Select relationship"
              onChange={(v) => setValue("relationship", v)}
            />
            <div className={styles.field}>
              <label className={styles.label} htmlFor="googleChildEmail">Child&apos;s email <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(optional if you know their LRN)</span></label>
              <input id="googleChildEmail" type="email" className={styles.input} value={values.childEmail ?? ""} onChange={(e) => setValue("childEmail", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="googleChildLrn">Child&apos;s LRN <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(optional if you know their email)</span></label>
              <input id="googleChildLrn" inputMode="numeric" pattern="[0-9]*" maxLength={12} className={styles.input} value={values.childLrn ?? ""} onChange={(e) => setValue("childLrn", e.target.value.replace(/[^0-9]/g, "").slice(0, 12))} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="googleAddressP">Address <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(optional)</span></label>
              <input id="googleAddressP" className={styles.input} value={values.address ?? ""} onChange={(e) => setValue("address", e.target.value)} />
            </div>
          </>
        ) : null}

        {role === "teacher" ? (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="googleEmployeeId">Employee ID</label>
              <input id="googleEmployeeId" className={styles.input} required value={values.employeeId ?? ""} onChange={(e) => setValue("employeeId", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="googleDepartment">Department <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(optional)</span></label>
              <input id="googleDepartment" className={styles.input} value={values.department ?? ""} onChange={(e) => setValue("department", e.target.value)} />
            </div>
            <DatePicker
              id="googleDateHired"
              label={
                <>
                  Date hired{" "}
                  <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(optional)</span>
                </>
              }
              value={values.dateHired ?? ""}
              max={new Date().toISOString().slice(0, 10)}
              placeholder="Select date hired"
              onChange={(v) => setValue("dateHired", v)}
            />
          </>
        ) : null}

        <button type="submit" className={styles.submitBtn} disabled={submitting}>
          {submitting ? <span className={styles.spinner} /> : `Create ${role} account`}
        </button>
      </form>
    </>
  );
}