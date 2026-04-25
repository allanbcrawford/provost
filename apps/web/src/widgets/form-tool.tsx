"use client";

import { Button, Input, Label } from "@provost/ui";
import { useMutation } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type FormField = {
  label: string;
  name: string;
  type: "text" | "number" | "email" | "phone" | "date" | "select" | "textarea";
  required?: boolean;
  default_value?: string | null;
  options?: string[];
};

export type FormToolWidgetProps = {
  title: string;
  description?: string;
  fields: FormField[];
  runId: Id<"thread_runs">;
  toolCallId: string;
};

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (name: string, value: string) => void;
}) {
  if (field.type === "select" && field.options) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`field-${field.name}`}>
          {field.label}
          {field.required && <span className="ml-0.5 text-red-500">*</span>}
        </Label>
        <select
          id={`field-${field.name}`}
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          required={field.required}
          className="flex h-9 w-full rounded-[8px] border border-provost-border-subtle bg-white px-3 py-1 text-provost-text-primary text-sm outline-none focus-visible:border-provost-border-default focus-visible:ring-2 focus-visible:ring-provost-border-default/30"
        >
          <option value="">Select...</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`field-${field.name}`}>
          {field.label}
          {field.required && <span className="ml-0.5 text-red-500">*</span>}
        </Label>
        <textarea
          id={`field-${field.name}`}
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          required={field.required}
          placeholder={field.label}
          className="flex min-h-[80px] w-full resize-none rounded-[8px] border border-provost-border-subtle bg-white px-3 py-2 text-provost-text-primary text-sm outline-none focus-visible:border-provost-border-default focus-visible:ring-2 focus-visible:ring-provost-border-default/30"
        />
      </div>
    );
  }

  const inputType =
    field.type === "phone"
      ? "tel"
      : field.type === "number"
        ? "number"
        : field.type === "email"
          ? "email"
          : field.type === "date"
            ? "date"
            : "text";

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`field-${field.name}`}>
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      <Input
        id={`field-${field.name}`}
        type={inputType}
        value={value}
        onChange={(e) => onChange(field.name, e.target.value)}
        required={field.required}
        placeholder={field.label}
      />
    </div>
  );
}

export function FormToolWidget({
  title,
  description,
  fields,
  runId,
  toolCallId,
}: FormToolWidgetProps) {
  const submitMutation = useMutation(api.agent.tools.formSubmit.submit);
  const [submitted, setSubmitted] = useState(false);

  const defaultData = useMemo(
    () => Object.fromEntries(fields.map((f) => [f.name, String(f.default_value ?? "")])),
    [fields],
  );
  const [formData, setFormData] = useState<Record<string, string>>(defaultData);

  const handleChange = useCallback((name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    await submitMutation({ runId, toolCallId, values: formData });
    setSubmitted(true);
  }, [submitMutation, runId, toolCallId, formData]);

  if (submitted) {
    return (
      <div className="flex w-full max-w-sm items-center justify-center rounded-lg border border-provost-border-subtle bg-provost-bg-muted p-4 text-provost-text-muted text-sm">
        Form submitted
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col space-y-4 rounded-lg border border-provost-border-subtle bg-white p-4">
      <div className="flex flex-col space-y-1">
        <h2 className="font-semibold text-lg text-provost-text-primary">{title}</h2>
        {description && <p className="text-provost-text-muted text-sm">{description}</p>}
      </div>

      <div className="flex flex-col space-y-4">
        {fields.map((field) => (
          <FieldInput
            key={field.name}
            field={field}
            value={formData[field.name] ?? ""}
            onChange={handleChange}
          />
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="button" size="sm" onClick={handleSubmit}>
          Submit
        </Button>
      </div>
    </div>
  );
}
