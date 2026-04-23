# Staging Smoke Test Checklist

Run this checklist on every staging deployment before promoting to production. Use a real browser in an incognito window against `https://staging.provost.app` (or your staging URL).

---

## Pre-flight

- [ ] Staging Convex deployment is running and reachable (Convex Dashboard → `provost-staging` → Health: green)
- [ ] Clerk dev instance is active (Clerk Dashboard → dev instance → Users list loads)
- [ ] Vercel staging deployment shows `Ready` status

---

## 1. Sign up

- [ ] Navigate to `https://staging.provost.app`
- [ ] You are redirected to `/sign-in`
- [ ] Click **Sign up** and create a new account with a test email address
- [ ] Email verification or magic link flow completes without error
- [ ] After signing in, you land on the home page (not a blank screen or error)
- [ ] The demo **Williams Family** is visible in the family selector

---

## 2. Family page

- [ ] Navigate to `/family`
- [ ] Family tree renders with expected members (12 seeded members)
- [ ] Each member card shows name, role, and generation correctly
- [ ] No console errors in browser devtools

---

## 3. Chat — waterfall simulation

- [ ] Open the chat panel (bottom-right button or `/chat` route)
- [ ] Type: **"show me the waterfall with ILIT"**
- [ ] The agent responds within 30 seconds
- [ ] A waterfall/simulation modal or chart opens
- [ ] No error toast or unhandled rejection appears

---

## 4. Task approval

- [ ] Navigate to `/governance`
- [ ] Switch to the **Approvals** tab
- [ ] If no pending approvals: trigger one by asking the agent to perform an action that requires approval (e.g. draft a letter)
- [ ] An approval card appears in the queue
- [ ] Click **Approve**
- [ ] The card moves out of the pending state (confirmed or completed status)

---

## 5. Audit log

- [ ] Navigate to `/governance/audit`
- [ ] Audit log table loads with entries
- [ ] The approval action from step 4 appears in the log with correct category (`approval`) and actor
- [ ] The tester invite (if performed) appears with action `tester_invited`

---

## 6. Tester invite flow (admin-only)

- [ ] Sign in as an admin account (or promote test account to admin in Convex Dashboard)
- [ ] Navigate to `/governance/testers`
- [ ] Page loads without redirect
- [ ] Click **Refresh** — demo family members table appears
- [ ] Enter a new test email and click **Send invite**
- [ ] Success: invite link shown in UI (if `CLERK_SECRET_KEY` set) or confirmation message
- [ ] Click **Refresh** — new member appears in the table with `pending` onboarding status
- [ ] Audit log at `/governance/audit` shows the new `tester_invited` entry

---

## 7. Signals

- [ ] Navigate to `/signals`
- [ ] Signal cards render with severity badges
- [ ] No infinite loading spinner

---

## 8. Rollback check

- [ ] If any step above fails, document the failure in your PR/deployment notes
- [ ] Roll back using: Vercel Dashboard → Deployments → previous → Promote to Production
- [ ] Or via Convex: `npx convex deploy --url <staging-url>` from the last known-good git SHA

---

## Sign-off

| Tester | Date | Result |
|--------|------|--------|
| | | Pass / Fail |

Attach screenshot evidence for any failures before promoting to production.
