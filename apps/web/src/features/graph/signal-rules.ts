import { ageYears, shortName } from "./format";
import type { DocProfLink, Document, Member, MemberDocLink, Professional, Signal } from "./types";

type Ctx = {
  members: Member[];
  docs: Document[];
  pros: Professional[];
  memberDocLinks: MemberDocLink[];
  docProfLinks: DocProfLink[];
};

const ESTATE_ATTY_PREDICATE = (p: Professional) => /attorney|law/i.test(p.profession);
const ACCOUNTANT_PREDICATE = (p: Professional) => /account|tax/i.test(p.profession);
const ADVISOR_PREDICATE = (p: Professional) => /advisor|wealth/i.test(p.profession);

function docsForMember(memberId: string, docs: Document[], links: MemberDocLink[]): Document[] {
  const ids = new Set(links.filter((l) => l.memberId === memberId).map((l) => l.documentId));
  return docs.filter((d) => ids.has(d.id));
}

function memberHasDocOfType(member: Member, typePattern: RegExp, ctx: Ctx): boolean {
  return docsForMember(member.id, ctx.docs, ctx.memberDocLinks).some(
    (d) => typePattern.test(d.type) || typePattern.test(d.name),
  );
}

function suggestedPro(ctx: Ctx, predicate: (p: Professional) => boolean): string | undefined {
  return ctx.pros.find(predicate)?.id;
}

export function ruleGen1Baseline(ctx: Ctx): Signal[] {
  const required: Array<{ label: string; pattern: RegExp }> = [
    { label: "Last Will", pattern: /Last Will/i },
    { label: "Revocable Living Trust", pattern: /Revocable Living Trust/i },
    { label: "Pour-Over Will", pattern: /Pour-Over Will/i },
    { label: "Letter of Intent", pattern: /Letter of Intent/i },
  ];
  const out: Signal[] = [];
  for (const m of ctx.members.filter((mm) => mm.generation === 1)) {
    for (const req of required) {
      if (!memberHasDocOfType(m, req.pattern, ctx)) {
        out.push({
          id: `sig-g1-${m.id}-${req.label.replace(/\s+/g, "-").toLowerCase()}`,
          severity: "missing",
          category: "missing",
          title: `Missing ${req.label}`,
          reason: `${shortName(m)} (Gen 1) should have a ${req.label} on file.`,
          suggestedAction: `Draft a ${req.label} for ${shortName(m)} that aligns with the current family governance plan.`,
          memberIds: [m.id],
          suggestedProfessionalId: suggestedPro(ctx, ESTATE_ATTY_PREDICATE),
        });
      }
    }
  }
  return out;
}

export function ruleGen2Baseline(ctx: Ctx): Signal[] {
  const out: Signal[] = [];
  for (const m of ctx.members.filter((mm) => mm.generation === 2)) {
    const myDocs = docsForMember(m.id, ctx.docs, ctx.memberDocLinks);
    const hasWill = myDocs.some((d) => /Last Will|Pour-Over Will/i.test(d.type));
    const hasTrustBeneficiary = myDocs.some((d) => /Trust/i.test(d.type));
    if (!hasWill) {
      out.push({
        id: `sig-g2-${m.id}-will`,
        severity: "missing",
        category: "missing",
        title: "Missing Last Will",
        reason: `${shortName(m)} (Gen 2) has no will linked to their name.`,
        suggestedAction: `Prepare a simple Last Will for ${shortName(m)} naming guardians for minor children and tying bequests to the family trust.`,
        memberIds: [m.id],
        suggestedProfessionalId: suggestedPro(ctx, ESTATE_ATTY_PREDICATE),
      });
    }
    if (!hasTrustBeneficiary) {
      out.push({
        id: `sig-g2-${m.id}-trust`,
        severity: "missing",
        category: "missing",
        title: "Not named in any trust",
        reason: `${shortName(m)} (Gen 2) isn't listed as a beneficiary in any trust on file.`,
        suggestedAction: `Add ${shortName(m)} as a named beneficiary on the Williams Family Living Trust schedule.`,
        memberIds: [m.id],
        suggestedProfessionalId: suggestedPro(ctx, ESTATE_ATTY_PREDICATE),
      });
    }
  }
  return out;
}

export function ruleGen3Adults(ctx: Ctx): Signal[] {
  const out: Signal[] = [];
  for (const m of ctx.members.filter((mm) => mm.generation === 3)) {
    if (!m.date_of_birth || ageYears(m.date_of_birth) < 18) continue;
    const hasWill = docsForMember(m.id, ctx.docs, ctx.memberDocLinks).some((d) =>
      /Last Will|Pour-Over Will/i.test(d.type),
    );
    if (!hasWill) {
      out.push({
        id: `sig-g3-${m.id}-will`,
        severity: "missing",
        category: "missing",
        title: "Missing Last Will (adult)",
        reason: `${shortName(m)} is ≥ 18 and has no will on file.`,
        suggestedAction: `Walk ${shortName(m)} through a first-time will, including POA + healthcare directive.`,
        memberIds: [m.id],
        suggestedProfessionalId: suggestedPro(ctx, ESTATE_ATTY_PREDICATE),
      });
    }
  }
  return out;
}

export function ruleFlaggedDocs(ctx: Ctx): Signal[] {
  const out: Signal[] = [];
  for (const d of ctx.docs) {
    if (d.observation?.type !== "danger") continue;
    const memberIds = ctx.memberDocLinks
      .filter((l) => l.documentId === d.id)
      .map((l) => l.memberId);
    const proId =
      ctx.docProfLinks.find((l) => l.documentId === d.id)?.professionalId ??
      suggestedPro(ctx, ESTATE_ATTY_PREDICATE);
    out.push({
      id: `sig-flag-${d.id}`,
      severity: "review",
      category: "conflict",
      title: `Review required: ${d.name.length > 48 ? `${d.name.slice(0, 48)}…` : d.name}`,
      reason:
        "This document has been flagged by the system and needs a professional to re-review before it's considered current.",
      suggestedAction: `Schedule a redline review of ${d.name} and confirm the named parties still reflect current family intent.`,
      memberIds,
      relatedDocumentId: d.id,
      suggestedProfessionalId: proId,
    });
  }
  return out;
}

const STALE_AGE_DAYS = 180;

export function ruleStaleDocs(ctx: Ctx): Signal[] {
  const out: Signal[] = [];
  const nowSec = Date.now() / 1000;
  for (const d of ctx.docs) {
    if (d.updated_at !== null) continue;
    const ageDays = (nowSec - d.created_at) / 86400;
    if (ageDays < STALE_AGE_DAYS) continue;
    const memberIds = ctx.memberDocLinks
      .filter((l) => l.documentId === d.id)
      .map((l) => l.memberId);
    let predicate: (p: Professional) => boolean = ESTATE_ATTY_PREDICATE;
    if (d.category === "financial_statements") {
      predicate = /GRAT|CRUT|Insurance/i.test(d.type) ? ACCOUNTANT_PREDICATE : ADVISOR_PREDICATE;
    }
    out.push({
      id: `sig-stale-${d.id}`,
      severity: "stale",
      category: "risk",
      title: `Stale — needs review: ${d.name.length > 40 ? `${d.name.slice(0, 40)}…` : d.name}`,
      reason: `No updates recorded in ${Math.round(ageDays)} days. Confirm the terms still reflect current intent.`,
      suggestedAction: `Request a fresh review of ${d.name} and re-date the document once provisions are confirmed.`,
      memberIds,
      relatedDocumentId: d.id,
      suggestedProfessionalId: suggestedPro(ctx, predicate),
    });
  }
  return out;
}

export function computeSignals(ctx: Ctx): Signal[] {
  return [
    ...ruleGen1Baseline(ctx),
    ...ruleGen2Baseline(ctx),
    ...ruleGen3Adults(ctx),
    ...ruleFlaggedDocs(ctx),
    ...ruleStaleDocs(ctx),
  ];
}
