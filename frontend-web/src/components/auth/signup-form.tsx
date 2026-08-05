"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, GraduationCap, Presentation, ShieldCheck, UserPlus, Users, X } from "lucide-react";
import { sileo } from "sileo";
import { api, ApiClientError } from "@/lib/api";
import type { RegisterResponse } from "@/lib/auth";
import { getPasswordStrength } from "@/lib/password";
import { PasswordInput } from "@/components/ui/password-input";
import { CustomSelect, type SelectOption } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import styles from "./signup-form.module.css";

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

export function SignupForm() {
  const router = useRouter();
  const [role, setRole] = useState<SignupRole>("student");
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const wasSatisfiedRef = useRef(false);
  const passwordToastRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmMatchRef = useRef<boolean | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (passwordToastRef.current) sileo.dismiss(passwordToastRef.current);
    };
  }, []);

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function dismissPasswordToast() {
    if (passwordToastRef.current) {
      sileo.dismiss(passwordToastRef.current);
      passwordToastRef.current = null;
    }
  }

  function switchRole(next: SignupRole) {
    if (next === role) return;
    setRole(next);
    sileo.info({
      title: `Creating a ${next} account`,
      description: next === "parent" ? "You can link your child using their email or LRN." : "Fill in the details below to register.",
      icon: <UserPlus size={18} />,
    });
  }

  function handlePasswordChange(value: string) {
    setValue("password", value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (!value) {
      dismissPasswordToast();
      wasSatisfiedRef.current = false;
      return;
    }

    const { satisfied, rules } = getPasswordStrength(value);

    if (satisfied) {
      dismissPasswordToast();
      if (!wasSatisfiedRef.current) {
        wasSatisfiedRef.current = true;
        sileo.success({
          title: "Great password!",
          description: "All requirements are met.",
          icon: <ShieldCheck size={18} />,
        });
      }
      return;
    }

    wasSatisfiedRef.current = false;
    const missing = rules.filter((r) => !r.met).map((r) => r.label);

    debounceRef.current = setTimeout(() => {
      dismissPasswordToast();
      passwordToastRef.current = sileo.info({
        title: "Password must include",
        description: (
          <ul className={styles.requirementList}>
            {missing.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        ),
        icon: <ShieldCheck size={18} />,
      });
    }, 200);
  }

  function handleConfirmChange(value: string) {
    setValue("confirmPassword", value);
    if (!value) {
      confirmMatchRef.current = null;
      return;
    }
    const matches = value === values.password;
    if (matches !== confirmMatchRef.current) {
      confirmMatchRef.current = matches;
      if (matches) {
        sileo.success({
          title: "Passwords match",
          description: "Your confirmation matches the password.",
          icon: <Check size={18} />,
        });
      } else {
        sileo.error({
          title: "Passwords don't match",
          description: "Confirm password must match the password.",
          icon: <X size={18} />,
        });
      }
    }
  }

  function handleLrnChange(value: string) {
    setValue("lrn", value.replace(/[^0-9]/g, "").slice(0, 12));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const { satisfied } = getPasswordStrength(values.password ?? "");
    if (!satisfied) {
      sileo.error({
        title: "Password too weak",
        description: "Meet all password requirements to continue.",
        icon: <ShieldCheck size={18} />,
      });
      return;
    }
    if ((values.confirmPassword ?? "") !== (values.password ?? "")) {
      sileo.error({
        title: "Passwords don't match",
        description: "Your confirm password must match the password.",
        icon: <X size={18} />,
      });
      return;
    }

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
      await sileo.promise(
        api<{ data: RegisterResponse }>(endpoint, { method: "POST", body }),
        {
          loading: {
            title: `Creating ${role} account…`,
            description: "Submitting your registration.",
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
      router.refresh();
    } catch {
      // sileo.promise already surfaced the error toast
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
              <input
                id="lrn"
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
                id="gradeLevel"
                label="Grade level"
                value={values.gradeLevel ?? ""}
                options={GRADE_LEVELS}
                placeholder="Select grade"
                onChange={(v) => setValue("gradeLevel", v)}
              />
              <CustomSelect
                id="sex"
                label="Sex"
                value={values.sex ?? ""}
                options={SEXES}
                placeholder="Select sex"
                onChange={(v) => setValue("sex", v)}
              />
            </div>
            <DatePicker
              id="birthdate"
              label="Birthdate"
              value={values.birthdate ?? ""}
              max={new Date().toISOString().slice(0, 10)}
              placeholder="Select birthdate"
              onChange={(v) => setValue("birthdate", v)}
            />
          </>
        ) : null}

        {role === "parent" ? (
          <>
            <CustomSelect
              id="relationship"
              label="Relationship to student"
              value={values.relationship ?? ""}
              options={RELATIONSHIPS}
              placeholder="Select relationship"
              onChange={(v) => setValue("relationship", v)}
            />
            <div className={styles.field}>
              <label className={styles.label} htmlFor="childEmail">Child&apos;s email <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(optional if you know their LRN)</span></label>
              <input id="childEmail" type="email" className={styles.input} value={values.childEmail ?? ""} onChange={(e) => setValue("childEmail", e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="childLrn">Child&apos;s LRN <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(optional if you know their email)</span></label>
              <input id="childLrn" inputMode="numeric" pattern="[0-9]*" maxLength={12} className={styles.input} value={values.childLrn ?? ""} onChange={(e) => setValue("childLrn", e.target.value.replace(/[^0-9]/g, "").slice(0, 12))} />
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
            <DatePicker
              id="dateHired"
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

        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">Email</label>
          <input id="email" type="email" className={styles.input} required value={values.email ?? ""} onChange={(e) => setValue("email", e.target.value)} />
        </div>

        <PasswordInput
          id="password"
          label="Password"
          value={values.password ?? ""}
          required
          showStrength
          autoComplete="new-password"
          placeholder="Create a strong password"
          onChange={handlePasswordChange}
        />

        <PasswordInput
          id="confirmPassword"
          label="Confirm password"
          value={values.confirmPassword ?? ""}
          required
          autoComplete="new-password"
          placeholder="Re-enter your password"
          onChange={handleConfirmChange}
        />

        <button type="submit" className={styles.submitBtn} disabled={submitting}>
          {submitting ? <span className={styles.spinner} /> : `Create ${role} account`}
        </button>
      </form>
    </>
  );
}