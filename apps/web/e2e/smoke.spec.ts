import { expect, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// Live smoke test — no auth required
// ---------------------------------------------------------------------------

test("home page displays Provost", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("text=Provost").first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// Auth-gated smoke tests — scaffolded for Phase 8
//
// Full Clerk sign-in requires a pre-authed storageState (saved browser session)
// or Clerk's testing token bypass mode. Neither is wired up until Phase 8.
// Each test below is marked test.fixme() so it is skipped but documented in
// the Playwright report. Remove fixme() and add storageState once Phase 8
// delivers the storageState fixture (TODO: Phase 8 – storageState setup).
// ---------------------------------------------------------------------------

test.describe("authenticated flows (Phase 8)", () => {
  test.fixme("dashboard: sign in as admin → dashboard loads → sidebar renders", async ({
    page,
  }) => {
    // TODO: Phase 8 – storageState setup
    // Load pre-authed Clerk session:
    //   test.use({ storageState: "playwright/.auth/admin.json" })
    await page.goto("/dashboard");
    await expect(page.locator("[data-testid='sidebar']")).toBeVisible();
    await expect(page.locator("h1")).toContainText(/dashboard/i);
  });

  test.fixme("/family: graph renders with signal badges and flagged-only filter", async ({
    page,
  }) => {
    // TODO: Phase 8 – storageState setup
    await page.goto("/family");
    // Graph canvas / node container should be visible
    await expect(page.locator("[data-testid='family-graph']")).toBeVisible();
    // Signal badge count should be > 0
    await expect(page.locator("[data-testid='signal-badge']").first()).toBeVisible();
    // Flagged-only filter toggle
    await page.click("[data-testid='flagged-only-toggle']");
    await expect(page.locator("[data-testid='family-graph']")).toBeVisible();
  });

  test.fixme("chat: 'inheritance simulation with ILIT' → WaterfallModal opens with revisions", async ({
    page,
  }) => {
    // TODO: Phase 8 – storageState setup
    await page.goto("/chat");
    await page.fill("[data-testid='chat-input']", "inheritance simulation with ILIT");
    await page.keyboard.press("Enter");
    // WaterfallModal should open with revision set populated
    await expect(page.locator("[data-testid='waterfall-modal']")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("[data-testid='waterfall-revisions']")).not.toBeEmpty();
  });

  test.fixme("signal draft revision: draft via chat → Send to planner → /governance shows task", async ({
    page,
  }) => {
    // TODO: Phase 8 – storageState setup
    await page.goto("/signals");
    await page.click("[data-testid='signal-item']:first-child");
    await page.click("[data-testid='draft-revision-btn']");
    // Chat drafts a revision
    await expect(page.locator("[data-testid='revision-draft']")).not.toBeEmpty({ timeout: 10000 });
    await page.click("[data-testid='send-to-planner-btn']");
    // /governance should surface the new task
    await page.goto("/governance");
    await expect(page.locator("[data-testid='governance-task']").first()).toBeVisible();
  });

  test.fixme("/library: search returns results and facets filter correctly", async ({ page }) => {
    // TODO: Phase 8 – storageState setup
    await page.goto("/library");
    await page.fill("[data-testid='library-search']", "trust");
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-testid='library-result']").first()).toBeVisible({
      timeout: 8000,
    });
    // Apply a facet filter and confirm results update
    await page.click("[data-testid='facet-item']:first-child");
    await expect(page.locator("[data-testid='library-result']").first()).toBeVisible();
  });

  test.fixme("/documents/[id]: PDF viewer renders document content", async ({ page }) => {
    // TODO: Phase 8 – storageState setup
    // Navigate to the first document in the list, then open it
    await page.goto("/documents");
    const firstDoc = page.locator("[data-testid='document-item']").first();
    await expect(firstDoc).toBeVisible();
    await firstDoc.click();
    // PDF viewer should load
    await expect(page.locator("[data-testid='pdf-viewer']")).toBeVisible({ timeout: 10000 });
  });

  test.fixme("/governance/audit: audit log contains events from current session", async ({
    page,
  }) => {
    // TODO: Phase 8 – storageState setup
    await page.goto("/governance/audit");
    // At least one audit event should be present
    await expect(page.locator("[data-testid='audit-event']").first()).toBeVisible();
  });
});
