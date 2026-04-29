import type { InputHTMLAttributes } from "react";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function InputField({ label, hint, ...props }: InputFieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input className="field-input" {...props} />
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}
