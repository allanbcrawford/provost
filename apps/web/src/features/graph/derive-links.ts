import type { DocProfLink, Document, Member, MemberDocLink, Professional } from "./types";

const MEMBER_ALIASES: Record<string, string[]> = {
  "Robert Williams": ["Robert James Williams", "Robert J. Williams", "Robert Williams", "Robert"],
  "Linda Williams": ["Linda Marie Williams", "Linda Williams", "Linda"],
  "David Williams": ["David Robert Williams", "David R. Williams", "David Williams"],
  "Susan Williams": ["Susan Williams", "Susan E. Williams"],
  "Jennifer Williams": ["Jennifer Williams", "Jennifer Anne Williams"],
  "Michael Reynolds": ["Michael Reynolds", "Michael T. Reynolds"],
  "Emily Williams": ["Emily Williams", "Emily Grace Williams"],
  "Ryan Williams": ["Ryan Williams", "Ryan David Williams"],
  "Sophia Williams": ["Sophia Williams", "Sophia Rose Williams"],
  "Matthew Reynolds": ["Matthew Reynolds", "Matthew James Reynolds"],
  "Chloe Reynolds": ["Chloe Reynolds", "Chloe Anne Reynolds"],
  "Ethan Reynolds": ["Ethan Reynolds", "Ethan Robert Reynolds"],
};

function aliasesFor(m: Member): string[] {
  const key = `${m.first_name} ${m.last_name}`;
  return MEMBER_ALIASES[key] ?? [key];
}

function docText(d: Document): string {
  return `${d.name}\n${d.description}\n${d.summary}`.toLowerCase();
}

export function deriveMemberDocLinks(members: Member[], docs: Document[]): MemberDocLink[] {
  const links: MemberDocLink[] = [];
  for (const d of docs) {
    const text = docText(d);
    for (const m of members) {
      const hit = aliasesFor(m).some((alias) => text.includes(alias.toLowerCase()));
      if (hit) links.push({ memberId: m.id, documentId: d.id });
    }
    if (
      /family constitution|governance charter|family limited partnership|dynasty trust/i.test(
        d.name,
      )
    ) {
      for (const m of members.filter((mm) => mm.generation === 1)) {
        if (!links.some((l) => l.memberId === m.id && l.documentId === d.id)) {
          links.push({ memberId: m.id, documentId: d.id });
        }
      }
    }
  }
  return links;
}

export function deriveDocProfLinks(docs: Document[], pros: Professional[]): DocProfLink[] {
  const attorney = pros.find((p) => /attorney|law/i.test(p.profession) || /law/i.test(p.firm));
  const accountant = pros.find((p) => /account|tax/i.test(p.profession));
  const advisor = pros.find((p) => /advisor|wealth/i.test(p.profession));

  const links: DocProfLink[] = [];
  for (const d of docs) {
    let proId: string | undefined;
    const type = d.type.toLowerCase();
    const cat = d.category;

    if (/grantor retained|charitable|insurance trust|crut|grat|ilit/.test(type)) {
      proId = accountant?.id ?? attorney?.id;
    } else if (/limited partnership|dynasty|governance/.test(`${type} ${d.name.toLowerCase()}`)) {
      proId = advisor?.id ?? attorney?.id;
    } else if (cat === "estate_plan" || /will|trust|letter of intent/.test(type)) {
      proId = attorney?.id;
    } else {
      proId = advisor?.id ?? attorney?.id;
    }
    if (proId) links.push({ documentId: d.id, professionalId: proId });
  }
  return links;
}
