# Launch Announcement Templates

Use these templates when provost.app goes live. Send in order: internal Slack first, then email to beta users, then enable the in-app banner.

---

## 1. Internal Slack (Engineering Channel)

**Channel:** `#engineering` (and optionally `#general`)

```
:rocket: provost.app is live on production.

DNS cutover complete. TLS verified. Sentry clean.

Next: monitor for 30 min, then post to beta users.
Rollback plan: docs/deploy/cutover.md — Rollback Plan section.

On-call: @<name>
```

---

## 2. Email to Beta Users

**Subject:** Provost is live — your private wealth command center is ready

**Body:**

```
Hi [First Name],

Your wait is over. Provost is now live at https://provost.app.

What you can do today:
- See your family's full financial picture in one place
- Run estate planning scenarios with the AI advisor
- Approve, delegate, and track decisions with a full audit trail

Sign in with the same credentials you used during beta:
https://provost.app/sign-in

What's new since your last beta session:
- Faster waterfall simulations
- Improved governance approvals flow
- Audit log available at /governance/audit

Questions? Reply to this email or reach us at support@provost.app.

— The Provost Team
```

---

## 3. Slack Message to Beta Users (if you have a shared Slack workspace)

**Channel:** `#provost-beta` or `#announcements`

```
Hey everyone — Provost is officially live at https://provost.app :tada:

Sign in with your existing credentials. Everything from your beta sessions is preserved.

A few highlights in this release:
• Waterfall simulations are faster
• Governance approvals flow is smoother
• Full audit log at /governance/audit

Drop any issues or feedback right here — we're watching closely for the next 48 hours.
```

---

## 4. In-App Banner

Display this banner for 7 days post-launch for users who sign in for the first time on production.

**Banner text (short — fits in ~80 chars):**

```
Welcome to Provost — now live. Your data from beta is here. Explore what's new.
```

**Banner text (expanded tooltip or modal):**

```
Provost is out of beta and running at full speed.

Your family data, scenarios, and governance history are all here.
We've improved simulation performance and the approvals workflow.

Need help? Visit our help center or email support@provost.app.
```

**Implementation note:** Set a `NEXT_PUBLIC_SHOW_LAUNCH_BANNER=true` environment variable in Vercel Production scoped to the launch window, and gate the banner component on it. Remove or set to `false` after 7 days.

---

## 5. Rollback / Incident Communication (if needed)

**Internal Slack — incident in progress:**

```
:warning: Production issue detected on provost.app.

We are investigating. Rolling back to previous deployment.
ETA to resolution: ~15 min.

Do not send external communications until resolved.
On-call: @<name>
Status thread: [link]
```

**External email — if outage exceeds 30 minutes:**

**Subject:** Brief service interruption — Provost

```
Hi [First Name],

We experienced a brief interruption to Provost shortly after launch today.
The issue has been resolved and the service is fully operational.

We apologize for the disruption. Your data is safe and no information was lost.

— The Provost Team
```
