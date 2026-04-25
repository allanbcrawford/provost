"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@provost/ui";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuthedFamily } from "@/context/family-context";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

const formSchema = z.object({
  piiRedaction: z.boolean(),
  nonAdviceDisclaimer: z.boolean(),
  showLegalDisclaimer: z.boolean(),
  showFinancialDisclaimer: z.boolean(),
  auditRetentionDays: z.coerce.number().int().min(1).max(2555),
});

type FormValues = z.infer<typeof formSchema>;

const PREF_KEYS = {
  piiRedaction: "guardrails.pii_redaction",
  nonAdviceDisclaimer: "guardrails.non_advice_disclaimer",
  showLegalDisclaimer: "disclaimers.show_legal",
  showFinancialDisclaimer: "disclaimers.show_financial",
  auditRetentionDays: "retention.audit_days",
} as const;

function toFormValues(prefs: Record<string, unknown> | undefined): FormValues {
  return {
    piiRedaction: prefs?.[PREF_KEYS.piiRedaction] !== false,
    nonAdviceDisclaimer: prefs?.[PREF_KEYS.nonAdviceDisclaimer] !== false,
    showLegalDisclaimer: prefs?.[PREF_KEYS.showLegalDisclaimer] !== false,
    showFinancialDisclaimer: prefs?.[PREF_KEYS.showFinancialDisclaimer] !== false,
    auditRetentionDays:
      typeof prefs?.[PREF_KEYS.auditRetentionDays] === "number"
        ? (prefs[PREF_KEYS.auditRetentionDays] as number)
        : 365,
  };
}

export function ComplianceSettings({ familyId: familyIdProp }: { familyId?: Id<"families"> }) {
  const contextFamily = useAuthedFamily();
  const familyId = familyIdProp ?? contextFamily?._id ?? null;
  const preferences = useQuery(api.compliance.getPreferences, familyId ? { familyId } : "skip");
  const setPreference = useMutation(api.compliance.setPreference);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(undefined),
  });

  useEffect(() => {
    if (preferences) {
      form.reset(toFormValues(preferences));
    }
  }, [preferences, form]);

  if (!familyId) {
    return <div className="text-provost-text-secondary text-sm">Select a family to continue.</div>;
  }
  if (preferences === undefined) {
    return <div className="text-provost-text-secondary text-sm">Loading…</div>;
  }

  async function onSubmit(values: FormValues) {
    if (!familyId) return;
    const current = toFormValues(preferences);
    const changes: { key: string; value: unknown }[] = [];
    (Object.keys(PREF_KEYS) as (keyof typeof PREF_KEYS)[]).forEach((field) => {
      if (values[field] !== current[field]) {
        changes.push({ key: PREF_KEYS[field], value: values[field] });
      }
    });
    if (changes.length === 0) {
      setSavedAt(Date.now());
      return;
    }
    setSaving(true);
    try {
      for (const change of changes) {
        await setPreference({ familyId, key: change.key, value: change.value });
      }
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <section className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="font-medium text-provost-text-primary">Guardrails</h2>
          <p className="mt-1 text-provost-text-secondary text-sm">
            Pre-flight safety checks applied to every user message.
          </p>
          <div className="mt-4 flex flex-col gap-4">
            <FormField
              control={form.control}
              name="piiRedaction"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      name={field.name}
                    />
                  </FormControl>
                  <div className="flex flex-col">
                    <FormLabel>Redact PII in chat</FormLabel>
                    <FormDescription>
                      Auto-redact SSNs, account numbers, and government IDs before the model sees
                      them.
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nonAdviceDisclaimer"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      name={field.name}
                    />
                  </FormControl>
                  <div className="flex flex-col">
                    <FormLabel>Append non-advice disclaimer</FormLabel>
                    <FormDescription>
                      When the model is asked for licensed legal, tax, or investment advice, prepend
                      a "not advice" notice.
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="font-medium text-provost-text-primary">Disclaimers</h2>
          <p className="mt-1 text-provost-text-secondary text-sm">
            Inline disclaimers shown on AI-generated artifacts.
          </p>
          <div className="mt-4 flex flex-col gap-4">
            <FormField
              control={form.control}
              name="showLegalDisclaimer"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      name={field.name}
                    />
                  </FormControl>
                  <div className="flex flex-col">
                    <FormLabel>Show legal disclaimer on AI drafts</FormLabel>
                    <FormDescription>
                      Display "not a substitute for licensed attorney review" on legal artifacts.
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="showFinancialDisclaimer"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      name={field.name}
                    />
                  </FormControl>
                  <div className="flex flex-col">
                    <FormLabel>Show financial disclaimer on AI analyses</FormLabel>
                    <FormDescription>
                      Display "not investment advice" on financial artifacts.
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="font-medium text-provost-text-primary">Audit retention</h2>
          <p className="mt-1 text-provost-text-secondary text-sm">
            How long audit events are retained before archival.
          </p>
          <div className="mt-4">
            <FormField
              control={form.control}
              name="auditRetentionDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Retention (days)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={2555}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormDescription>Between 1 and 2555 (7 years). Default 365.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving || !form.formState.isDirty}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {savedAt && !form.formState.isDirty ? (
            <span className="text-provost-text-secondary text-sm">Saved.</span>
          ) : null}
        </div>
      </form>
    </Form>
  );
}
