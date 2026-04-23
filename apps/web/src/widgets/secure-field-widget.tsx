"use client";
import { useState } from "react";

export type SecureFieldWidgetProps = {
  message?: string;
  reason?: string | null;
};

export function SecureFieldWidget({ message, reason }: SecureFieldWidgetProps) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // TODO(phase-7): wire real client-side encryption + server-side encrypted vault.
  // This is a visual stub for Phase 6 that accepts input but does not transmit it.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setValue("");
  };

  return (
    <div className="rounded-[8px] border border-provost-border-subtle bg-provost-bg-muted px-3 py-2.5 text-[12.5px] text-provost-text-secondary">
      <div className="mb-1.5 font-semibold text-provost-text-primary">Secure field</div>
      <div className="mb-2 text-[12px]">
        {message ??
          "Sensitive data detected in your message. It has been redacted. Use this secure field to submit the value instead."}
      </div>
      {reason ? (
        <div className="mb-2 text-[11.5px] text-provost-text-secondary italic">{reason}</div>
      ) : null}
      {submitted ? (
        <div className="rounded-[6px] border border-provost-border-subtle bg-provost-bg-primary px-2.5 py-1.5 text-[12px] text-provost-text-primary">
          Received securely. (stub — encryption will be wired in Phase 7)
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter sensitive value"
            className="flex-1 rounded-[6px] border border-provost-border-subtle bg-provost-bg-primary px-2.5 py-1.5 text-[12.5px] text-provost-text-primary"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={value.length === 0}
            className="rounded-[6px] border border-provost-border-subtle bg-provost-bg-primary px-3 py-1.5 text-[12px] font-medium text-provost-text-primary hover:bg-provost-bg-hover disabled:opacity-50"
          >
            Submit
          </button>
        </form>
      )}
    </div>
  );
}
