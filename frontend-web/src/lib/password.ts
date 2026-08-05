export interface PasswordRule {
  key: string;
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { key: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { key: "lower", label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { key: "number", label: "One number", test: (v) => /\d/.test(v) },
  { key: "symbol", label: "One special character", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export interface PasswordRuleState extends PasswordRule {
  met: boolean;
}

export function getPasswordRules(value: string): PasswordRuleState[] {
  return PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(value) }));
}

export function getPasswordScore(value: string): number {
  return PASSWORD_RULES.reduce((acc, rule) => acc + (rule.test(value) ? 1 : 0), 0);
}

export interface PasswordStrength {
  score: number;
  satisfied: boolean;
  level: number;
  label: string;
  color: string;
  rules: PasswordRuleState[];
}

const LEVELS: { min: number; label: string; color: string }[] = [
  { min: 1, label: "Weak", color: "var(--danger)" },
  { min: 3, label: "Fair", color: "var(--warning)" },
  { min: 4, label: "Good", color: "var(--info)" },
  { min: 5, label: "Strong", color: "var(--success)" },
];

export function getPasswordStrength(value: string): PasswordStrength {
  const rules = getPasswordRules(value);
  const score = getPasswordScore(value);
  const level = LEVELS.reduce((acc, lv) => (score >= lv.min ? lv : acc), LEVELS[0]);
  return {
    score,
    satisfied: rules.every((r) => r.met),
    level: score,
    label: score > 0 ? level.label : "",
    color: score > 0 ? level.color : "var(--border-strong)",
    rules,
  };
}