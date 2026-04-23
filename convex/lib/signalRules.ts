import type { Doc, Id } from "../_generated/dataModel";

export type SignalSeverity = "missing" | "review" | "stale";
export type SignalCategory = "missing" | "conflict" | "risk" | "recommendation";

export type RuleSignal = {
  rule_key: string;
  severity: SignalSeverity;
  category: SignalCategory;
  title: string;
  reason: string;
  suggested_action?: string;
  member_ids: Id<"users">[];
  related_document_id?: Id<"documents">;
  suggested_professional_id?: Id<"professionals">;
};

type Ctx = {
  members: Doc<"users">[];
  documents: Doc<"documents">[];
  professionals: Doc<"professionals">[];
};

const ESTATE_ATTY_PREDICATE = (p: Doc<"professionals">) => /attorney|law/i.test(p.profession);
const ACCOUNTANT_PREDICATE = (p: Doc<"professionals">) => /account|tax/i.test(p.profession);
const ADVISOR_PREDICATE = (p: Doc<"professionals">) => /advisor|wealth/i.test(p.profession);

const STALE_AGE_DAYS = 180;

function shortName(m: Doc<"users">): string {
  return `${m.first_name} ${m.last_name}`;
}

function ageYears(iso: string | undefined): number {
  if (!iso) return 0;
  const dob = new Date(iso);
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

function suggestedPro(
  ctx: Ctx,
  predicate: (p: Doc<"professionals">) => boolean,
): Id<"professionals"> | undefined {
  return ctx.professionals.find(predicate)?._id;
}

function familyHasDocOfType(pattern: RegExp, ctx: Ctx): boolean {
  return ctx.documents.some((d) => pattern.test(d.type) || pattern.test(d.name));
}

export function ruleGen1Baseline(ctx: Ctx): RuleSignal[] {
  const required: Array<{ label: string; pattern: RegExp }> = [
    { label: "Last Will", pattern: /Last Will/i },
    { label: "Revocable Living Trust", pattern: /Revocable Living Trust/i },
    { label: "Pour-Over Will", pattern: /Pour-Over Will/i },
    { label: "Letter of Intent", pattern: /Letter of Intent/i },
  ];
  const out: RuleSignal[] = [];
  const gen1 = ctx.members.filter((m) => m.generation === 1);
  if (gen1.length === 0) return out;
  for (const req of required) {
    if (familyHasDocOfType(req.pattern, ctx)) continue;
    out.push({
      rule_key: `gen1-baseline-${req.label.replace(/\s+/g, "-").toLowerCase()}`,
      severity: "missing",
      category: "missing",
      title: `Missing ${req.label}`,
      reason: `Gen 1 members (${gen1.map(shortName).join(", ")}) should have a ${req.label} on file.`,
      suggested_action: `Draft a ${req.label} that aligns with the current family governance plan.`,
      member_ids: gen1.map((m) => m._id),
      suggested_professional_id: suggestedPro(ctx, ESTATE_ATTY_PREDICATE),
    });
  }
  return out;
}

export function ruleGen2Baseline(ctx: Ctx): RuleSignal[] {
  const out: RuleSignal[] = [];
  const gen2 = ctx.members.filter((m) => m.generation === 2);
  if (gen2.length === 0) return out;
  const hasWill = ctx.documents.some((d) => /Last Will|Pour-Over Will/i.test(d.type));
  const hasTrust = ctx.documents.some((d) => /Trust/i.test(d.type));
  if (!hasWill) {
    out.push({
      rule_key: "gen2-baseline-will",
      severity: "missing",
      category: "missing",
      title: "Missing Last Will for Gen 2",
      reason: `No will is linked to Gen 2 members (${gen2.map(shortName).join(", ")}).`,
      suggested_action:
        "Prepare Last Wills naming guardians for minor children and tying bequests to the family trust.",
      member_ids: gen2.map((m) => m._id),
      suggested_professional_id: suggestedPro(ctx, ESTATE_ATTY_PREDICATE),
    });
  }
  if (!hasTrust) {
    out.push({
      rule_key: "gen2-baseline-trust",
      severity: "missing",
      category: "missing",
      title: "Gen 2 not named in any trust",
      reason: `No trust documents reference Gen 2 members (${gen2.map(shortName).join(", ")}).`,
      suggested_action: "Add Gen 2 members as named beneficiaries on the family trust schedule.",
      member_ids: gen2.map((m) => m._id),
      suggested_professional_id: suggestedPro(ctx, ESTATE_ATTY_PREDICATE),
    });
  }
  return out;
}

export function ruleGen3Adults(ctx: Ctx): RuleSignal[] {
  const out: RuleSignal[] = [];
  const hasWill = ctx.documents.some((d) => /Last Will|Pour-Over Will/i.test(d.type));
  for (const m of ctx.members) {
    if (m.generation !== 3) continue;
    if (ageYears(m.date_of_birth) < 18) continue;
    if (hasWill) continue;
    out.push({
      rule_key: `gen3-adult-will-${m._id}`,
      severity: "missing",
      category: "missing",
      title: `Missing Last Will (adult): ${shortName(m)}`,
      reason: `${shortName(m)} is 18+ and has no will on file.`,
      suggested_action: `Walk ${shortName(m)} through a first-time will, including POA + healthcare directive.`,
      member_ids: [m._id],
      suggested_professional_id: suggestedPro(ctx, ESTATE_ATTY_PREDICATE),
    });
  }
  return out;
}

export function ruleFlaggedDocs(ctx: Ctx): RuleSignal[] {
  const out: RuleSignal[] = [];
  for (const d of ctx.documents) {
    if (d.observation_type !== "danger") continue;
    out.push({
      rule_key: `flagged-doc-${d._id}`,
      severity: "review",
      category: "conflict",
      title: `Review required: ${d.name.length > 48 ? `${d.name.slice(0, 48)}…` : d.name}`,
      reason:
        "This document has been flagged by the system and needs a professional to re-review before it's considered current.",
      suggested_action: `Schedule a redline review of ${d.name} and confirm the named parties still reflect current family intent.`,
      member_ids: [],
      related_document_id: d._id,
      suggested_professional_id: suggestedPro(ctx, ESTATE_ATTY_PREDICATE),
    });
  }
  return out;
}

export function ruleStaleDocs(ctx: Ctx): RuleSignal[] {
  const out: RuleSignal[] = [];
  const nowMs = Date.now();
  for (const d of ctx.documents) {
    const ageDays = (nowMs - d._creationTime) / (86400 * 1000);
    if (ageDays < STALE_AGE_DAYS) continue;
    let predicate: (p: Doc<"professionals">) => boolean = ESTATE_ATTY_PREDICATE;
    if (d.category === "financial_statements") {
      predicate = /GRAT|CRUT|Insurance/i.test(d.type) ? ACCOUNTANT_PREDICATE : ADVISOR_PREDICATE;
    }
    out.push({
      rule_key: `stale-doc-${d._id}`,
      severity: "stale",
      category: "risk",
      title: `Stale — needs review: ${d.name.length > 40 ? `${d.name.slice(0, 40)}…` : d.name}`,
      reason: `No updates recorded in ${Math.round(ageDays)} days. Confirm the terms still reflect current intent.`,
      suggested_action: `Request a fresh review of ${d.name} and re-date the document once provisions are confirmed.`,
      member_ids: [],
      related_document_id: d._id,
      suggested_professional_id: suggestedPro(ctx, predicate),
    });
  }
  return out;
}

export function computeSignals(ctx: Ctx): RuleSignal[] {
  return [
    ...ruleGen1Baseline(ctx),
    ...ruleGen2Baseline(ctx),
    ...ruleGen3Adults(ctx),
    ...ruleFlaggedDocs(ctx),
    ...ruleStaleDocs(ctx),
  ];
}
