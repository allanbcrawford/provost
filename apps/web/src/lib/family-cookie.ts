export const FAMILY_COOKIE_NAME = "selectedFamilyId";
export const FAMILY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function writeFamilyCookie(id: string | null) {
  if (typeof document === "undefined") return;
  if (!id) {
    document.cookie = `${FAMILY_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `${FAMILY_COOKIE_NAME}=${encodeURIComponent(id)}; Path=/; Max-Age=${FAMILY_COOKIE_MAX_AGE}; SameSite=Lax`;
}
