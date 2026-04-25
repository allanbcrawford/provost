#!/usr/bin/env node
// Two-session browser audit runner for Provost.
//
// Drives `agent-browser` (must already be installed: npm i -g agent-browser).
// Both Chrome instances must already be running with --remote-debugging-port
// matching the ports in checks.json, and signed in.
//
// Usage:
//   node scripts/audit/run-audit.mjs                          # all checks
//   node scripts/audit/run-audit.mjs --section "§2"            # filter by section substring
//   node scripts/audit/run-audit.mjs --id 8.1-assets-total     # filter by id
//   node scripts/audit/run-audit.mjs --base-url http://localhost:3001
//
// Output: a markdown report at docs/walkthrough/runs/<YYYY-MM-DD-HHmm>.md
// and a JSON sibling at the same path with .json extension.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const checksPath = resolve(__dirname, "checks.json");
const spec = JSON.parse(readFileSync(checksPath, "utf8"));

const args = process.argv.slice(2);
const argFlag = (name, def = null) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const baseUrl = argFlag("--base-url", "http://localhost:3000").replace(/\/$/, "");
const sectionFilter = argFlag("--section");
const idFilter = argFlag("--id");

const runDir = resolve(repoRoot, "docs/walkthrough/runs");
mkdirSync(runDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:T]/g, "-").replace(/\..+/, "").slice(0, 16);
const mdPath = resolve(runDir, `${stamp}.md`);
const jsonPath = resolve(runDir, `${stamp}.json`);

function ab(...a) {
  // Run agent-browser; throw with stderr on non-zero exit so we surface failures clearly.
  try {
    return execFileSync("agent-browser", a, {
      encoding: "utf8",
      timeout: 30_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    const msg = (e.stderr ? e.stderr.toString() : "") + (e.stdout ? e.stdout.toString() : "");
    throw new Error(`agent-browser ${a.join(" ")}\n${msg || e.message}`);
  }
}

function cleanDaemon() {
  // Defensive: nuke stale ~/.agent-browser/*.{pid,sock,stream,version,engine}
  // BEFORE first connect. (Stale sockets from a killed daemon cause silent hangs.)
  const dir = resolve(process.env.HOME, ".agent-browser");
  if (!existsSync(dir)) return;
  for (const ext of ["pid", "sock", "stream", "version", "engine"]) {
    try {
      execFileSync("bash", ["-c", `rm -f ${dir}/*.${ext}`], { stdio: "ignore" });
    } catch {}
  }
}

function attach(port) {
  // close any prior session, then connect to the requested CDP port.
  try {
    ab("close");
  } catch {
    /* ignore — no prior session */
  }
  ab("connect", String(port));
}

function busyWait(ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {}
}

function navigate(path) {
  // Avoid `wait --load networkidle` on Provost: Convex websocket means networkidle never fires.
  // `agent-browser open` returns when the page commits but BEFORE Clerk auth + Convex query
  // hydration completes — checks that race ahead see logged-out skeletons.
  //
  // Wait protocol:
  //  (1) Wait for URL to settle to either `path` or to a redirect target (role-guard).
  //  (2) Wait for the personalized greeting "Hi, <name>" to no longer be the
  //      logged-out skeleton "Hi, there".
  //  Total budget: 8s. Aggregate poll interval: 200ms.
  ab("open", `${baseUrl}${path}`);
  const deadline = Date.now() + 8000;
  // Phase 1: URL settle
  while (Date.now() < deadline) {
    try {
      const u = evalJs("location.pathname");
      if (typeof u === "string" && u !== "about:blank") break;
    } catch {}
    busyWait(200);
  }
  // Phase 2: hydration. Two heuristics, both must clear:
  //   (a) If a "Hi, X" greeting is present, it must NOT be the logged-out skeleton "Hi, there".
  //   (b) document.body.innerText length is stable across two consecutive 250ms polls
  //       (Convex queries finishing typically grow innerText then stop).
  let prevLen = -1;
  let stableCount = 0;
  while (Date.now() < deadline) {
    try {
      const probe = evalJs(
        "(()=>{const g=[...document.querySelectorAll('h2')].map(h=>h.innerText).find(t=>t.startsWith('Hi,'));" +
          "return {greetReady: g===undefined ? true : g!=='Hi, there', len: document.body.innerText.length};})()",
      );
      if (probe && probe.greetReady) {
        if (probe.len === prevLen) {
          stableCount++;
          if (stableCount >= 2) return;
        } else {
          stableCount = 0;
          prevLen = probe.len;
        }
      }
    } catch {}
    busyWait(250);
  }
}

function evalJs(expr) {
  // agent-browser eval prints the JSON-encoded return value to stdout.
  const raw = ab("eval", expr).trim();
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function readErrors() {
  try {
    return ab("errors") || "";
  } catch {
    return "";
  }
}

function evalPass(passExpr, r, session) {
  // We control checks.json, so eval-as-Function is fine here. No external input.
  // eslint-disable-next-line no-new-func
  const fn = new Function("r", "session", `return (${passExpr});`);
  return fn(r, session);
}

const sessionsByName = Object.fromEntries(spec.sessions.map((s) => [s.name, s]));

const filteredChecks = spec.checks.filter((c) => {
  if (idFilter && c.id !== idFilter) return false;
  if (sectionFilter && !c.section.includes(sectionFilter)) return false;
  return true;
});

if (filteredChecks.length === 0) {
  console.error("No checks matched filters.");
  process.exit(1);
}

console.error(
  `Running ${filteredChecks.length} check(s) against ${baseUrl} for sessions: ${spec.sessions
    .map((s) => `${s.name}@${s.port}`)
    .join(", ")}\n`,
);

cleanDaemon();

// Group checks by session port to minimize attach/detach swaps.
const checksBySession = {};
for (const c of filteredChecks) {
  for (const sName of c.for) {
    if (!checksBySession[sName]) checksBySession[sName] = [];
    checksBySession[sName].push(c);
  }
}

const results = [];

for (const [sName, sessionChecks] of Object.entries(checksBySession)) {
  const session = sessionsByName[sName];
  if (!session) {
    console.error(`Unknown session "${sName}"; skipping.`);
    continue;
  }
  console.error(`-- attaching to ${session.name} on port ${session.port} --`);
  try {
    attach(session.port);
  } catch (e) {
    console.error(`Failed to attach ${session.name}: ${e.message}`);
    for (const c of sessionChecks) {
      results.push({
        ...c,
        session: sName,
        ok: false,
        error: `attach failed: ${e.message}`,
        actual: null,
      });
    }
    continue;
  }

  for (const c of sessionChecks) {
    const start = Date.now();
    let actual,
      ok = false,
      error = null;
    try {
      if (c.navigate) navigate(c.navigate);
      if (c.useErrorsCommand) {
        actual = readErrors();
      } else if (c.eval) {
        actual = evalJs(c.eval);
      }
      ok = evalPass(c.pass, actual, session);
    } catch (e) {
      error = e.message;
      ok = false;
    }
    const dur = Date.now() - start;
    const tag = ok ? "PASS" : error ? "ERR " : "FAIL";
    console.error(`  [${tag}] ${c.id}  ${session.name}  (${dur}ms)`);
    results.push({
      id: c.id,
      section: c.section,
      title: c.title,
      session: sName,
      ok,
      actual,
      error,
      durationMs: dur,
    });
  }
}

// Write JSON
writeFileSync(
  jsonPath,
  JSON.stringify({ runAt: new Date().toISOString(), baseUrl, results }, null, 2),
);

// Write markdown
const totals = {
  pass: results.filter((r) => r.ok).length,
  fail: results.filter((r) => !r.ok && !r.error).length,
  err: results.filter((r) => r.error).length,
};
const lines = [];
lines.push(`# Provost Audit Run — ${stamp}`);
lines.push("");
lines.push(`**Base URL:** ${baseUrl}`);
lines.push(
  `**Total:** ${results.length}  ·  **Pass:** ${totals.pass}  ·  **Fail:** ${totals.fail}  ·  **Error:** ${totals.err}`,
);
lines.push("");

const bySection = {};
for (const r of results) {
  if (!bySection[r.section]) bySection[r.section] = [];
  bySection[r.section].push(r);
}
for (const [sec, rows] of Object.entries(bySection)) {
  lines.push(`## ${sec}`);
  lines.push("");
  lines.push("| Check | Session | Result | Actual |");
  lines.push("|---|---|---|---|");
  for (const r of rows) {
    const sym = r.ok ? "✅" : r.error ? "💥" : "❌";
    const actualStr = r.error
      ? r.error.split("\n")[0].slice(0, 80)
      : JSON.stringify(r.actual).slice(0, 80);
    lines.push(`| ${r.id} ${r.title} | ${r.session} | ${sym} | \`${actualStr}\` |`);
  }
  lines.push("");
}

writeFileSync(mdPath, lines.join("\n"));
console.error(`\nWrote ${mdPath}`);
console.error(`Wrote ${jsonPath}`);
process.exit(totals.fail + totals.err > 0 ? 1 : 0);
