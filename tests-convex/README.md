# Convex tests

`convex-test` runs queries / mutations / actions against an in-memory
schema-and-storage shim. No real deployment required.

```bash
pnpm convex:test            # one-shot
pnpm convex:test:watch      # watch
```

## Patterns

- Each test gets a fresh in-memory store via `convexTest(schema)`.
- `t.run(async (ctx) => …)` lets us seed the DB directly with admin
  privileges (bypasses query/mutation auth gates).
- `t.withIdentity({ subject, … }).query(api.foo, args)` simulates a
  signed-in caller.
- Use the helpers in `_helpers.ts` to avoid re-typing the seed shape.

## Coverage today

Roughly:

- `acl.test.ts` — cross-family isolation on signals/documents/observations
  + member-vs-admin scope filtering
- `library.test.ts` — global library_sources fence (site-admin only)
- `signals.test.ts` — F-2: members see signals where they're in
  `member_ids[]`, not others
- `parties.test.ts` — resource creation grants party rows to
  creator + named members

Add new tests as new flows ship — a regression here is much cheaper than
finding it via browser audit.
