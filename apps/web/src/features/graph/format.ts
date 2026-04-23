import type { Member } from "./types";

export function formatName(m: Member): string {
  const mid = m.middle_name ? ` ${m.middle_name.charAt(0)}.` : "";
  return `${m.first_name}${mid} ${m.last_name}`;
}

export function shortName(m: Member): string {
  return `${m.first_name} ${m.last_name}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  if (parts.length <= 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? "";
  return `${(first[0] ?? "").toUpperCase()}${(last[0] ?? "").toUpperCase()}`;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ageYears(iso: string): number {
  const dob = new Date(iso);
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}
