export function log(
  level: "info" | "warn" | "error",
  event: string,
  fields: Record<string, unknown> = {},
): void {
  console.log(JSON.stringify({ level, event, ts: Date.now(), ...fields }));
}
