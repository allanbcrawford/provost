// Domain-specific scaffolding for LLM-generated signals (observations,
// red flags, recommendations) over family documents. Selected by
// document type so a will-flagging prompt focuses on probate / intestacy
// gaps while a trust-flagging prompt focuses on grantor-trust treatment,
// GST, and trustee duties.
//
// The actual signal-generation tool is not yet wired (today's pipeline is
// rule-based via lib/signalRules.ts). When that tool ships, callers should
// load the right scaffolding via signalScaffoldFor(documentType) and inject
// it into the LLM's system prompt as the domain instructions.

export function signalScaffoldFor(documentType: string | null | undefined): string {
  if (!documentType) return DEFAULT;
  const norm = documentType.toLowerCase();
  if (norm.includes("will")) return WILL;
  if (norm.includes("ilit") || norm.includes("life insurance")) return ILIT;
  if (norm.includes("revocable")) return REVOCABLE_TRUST;
  if (norm.includes("irrevocable")) return IRREVOCABLE_TRUST;
  if (norm.includes("dynasty")) return DYNASTY_TRUST;
  if (norm.includes("crut") || norm.includes("charitable")) return CHARITABLE_TRUST;
  if (norm.includes("flp") || norm.includes("partnership") || norm.includes("llc")) return FLP_LLC;
  if (norm.includes("idgt") || norm.includes("grantor")) return IDGT;
  if (norm.includes("grat")) return GRAT;
  if (norm.includes("constitution") || norm.includes("charter") || norm.includes("governance")) {
    return GOVERNANCE;
  }
  if (norm.includes("letter of intent") || norm.includes("ethical will")) return ETHICAL_WILL;
  return DEFAULT;
}

const DEFAULT = [
  "Read the document carefully. Surface any clauses that look internally",
  "inconsistent, that conflict with statements elsewhere in the family's",
  "estate plan, or that lack a clearly named responsible party. Cite the",
  "section or page where each issue appears.",
].join(" ");

const WILL = [
  "This is a will. Examine for:",
  "(1) Probate vs. non-probate asset coverage — are there assets the will",
  "purports to govern that pass by beneficiary designation or trust?",
  "(2) Intestacy gaps — does the residuary clause cover the full estate?",
  "(3) Spouse / child waterfall sanity — does the named order match the",
  "client's stated intent and current family composition?",
  "(4) Witness, notary, and self-proving affidavit requirements per the",
  "governing state. Flag missing elements.",
  "(5) Pour-over interaction — if a revocable trust is referenced, confirm",
  "the trust exists and is funded.",
  "(6) Tax apportionment clause — who pays estate taxes, and is the",
  "instruction internally consistent?",
  "Cite IRC § 2010 (applicable exclusion), § 2056 (marital deduction), and",
  "state code where relevant.",
].join(" ");

const ILIT = [
  "This is an Irrevocable Life Insurance Trust. Examine for:",
  "(1) Crummey withdrawal rights — are the beneficiaries' demand rights",
  "properly noticed and documented annually?",
  "(2) Three-year rule under IRC § 2035 — was the policy transferred,",
  "and if so, is the transfer dated more than three years before the",
  "insured's death? If newer, the proceeds risk inclusion in the estate.",
  "(3) Incidents of ownership — does the grantor retain any policy rights",
  "(borrowing, naming beneficiaries, surrendering)? Any retained right",
  "drags the proceeds back into the estate under § 2042.",
  "(4) GST exemption allocation — has the trust's GST status been",
  "addressed for skip beneficiaries?",
  "(5) Trustee independence — is the trustee free of family-control",
  "issues that would create inclusion under § 2036/2038?",
].join(" ");

const REVOCABLE_TRUST = [
  "This is a revocable living trust. Examine for:",
  "(1) Funding completeness — is there evidence the trust actually owns",
  "the assets the estate plan assumes (deeds, beneficiary designations,",
  "account titles)? Unfunded revocable trusts are a common quiet failure.",
  "(2) Successor trustee chain — clear named successors, or only the",
  "grantor as trustee?",
  "(3) Disability / incapacity provisions — clear standard for determining",
  "incapacity and successor stepping in?",
  "(4) Distribution standards on death — outright vs. continuing trusts;",
  "if continuing, are the trustee's discretionary powers ascertainable",
  "(HEMS) or broader?",
  "(5) Pour-over alignment — references in the will match this trust's",
  "name, date, and signatories?",
].join(" ");

const IRREVOCABLE_TRUST = [
  "This is an irrevocable trust. Examine for:",
  "(1) Grantor-trust status — is the trust intentionally defective",
  "(taxed to the grantor) or non-grantor? Cite the triggering",
  "powers under IRC §§ 671-679.",
  "(2) Distribution standards — HEMS vs. broader; trustee duties of",
  "loyalty, prudence, and impartiality.",
  "(3) GST exemption allocation and inclusion ratio.",
  "(4) Trustee succession and removal — does the family retain a power",
  "that risks estate inclusion (§§ 2036, 2038)?",
  "(5) Decanting / modification authority under the governing-law state.",
].join(" ");

const DYNASTY_TRUST = [
  "This is a dynasty trust intended to last across generations.",
  "Examine for: (1) governing law and Rule Against Perpetuities posture",
  "(state-law variation matters), (2) GST exemption allocation, (3)",
  "distribution standards across generations, (4) trustee succession,",
  "(5) trust protector or amendment mechanisms, (6) coordination with",
  "the grantor's other estate-planning instruments.",
].join(" ");

const CHARITABLE_TRUST = [
  "This is a charitable trust (likely CRUT or CRAT).",
  "Examine for: (1) qualification under IRC § 664 — payout rate, term,",
  "remainder beneficiary; (2) prohibited transactions / self-dealing under",
  "§ 4941; (3) tier-structure income-tax treatment of distributions to",
  "non-charitable beneficiaries; (4) documentation of charitable",
  "remainder valuation for the income-tax deduction.",
].join(" ");

const FLP_LLC = [
  "This is a family limited partnership / LLC operating agreement.",
  "Examine for: (1) valuation discount support — operating restrictions",
  "consistent with discounts taken on transfers; (2) management vs.",
  "ownership distinction; (3) transfer-restriction provisions and",
  "compliance with § 2036(b)(1) traps; (4) succession of management",
  "control.",
].join(" ");

const IDGT = [
  "This is an Intentionally Defective Grantor Trust. Examine for:",
  "(1) Grantor-trust trigger powers under §§ 671-679 (e.g. swap power,",
  "loan to grantor without adequate interest, etc.).",
  "(2) Note structure if the trust was funded via installment sale —",
  "AFR rate at execution, payment compliance.",
  "(3) Estate-inclusion risks if the trust holds back too many grantor",
  "rights.",
  "(4) GST exemption allocation.",
].join(" ");

const GRAT = [
  "This is a Grantor Retained Annuity Trust. Examine for:",
  "(1) Annuity payment compliance — actual payments, on time, in correct",
  "amounts; (2) § 2702 qualification — fixed annuity, term, valuation;",
  "(3) Mortality risk — if the grantor dies during the term, the trust",
  "assets revert to the estate (§ 2036); (4) GRAT chain strategy —",
  "is the family rolling expiring GRATs into new ones?",
].join(" ");

const GOVERNANCE = [
  "This is a family governance / charter / constitution document.",
  "Examine for: (1) alignment vs. drift with the legal instruments —",
  "does the governance document promise something the trusts can't",
  "deliver? (2) Decision-making authority and quorum mechanics; (3)",
  "amendment provisions; (4) successor leadership / generational",
  "transition triggers.",
].join(" ");

const ETHICAL_WILL = [
  "This is an ethical will / letter of intent. It's not a legal",
  "instrument but should be coherent with the legal documents.",
  "Examine for: (1) value statements that conflict with the legal",
  "estate plan (e.g. equal-treatment language vs. asymmetric trust",
  "distributions); (2) named beneficiaries who don't appear in the",
  "legal documents; (3) explicit guidance to trustees that should be",
  "memorialized in the trust instrument itself.",
].join(" ");
