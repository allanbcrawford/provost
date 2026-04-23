// TODO: implement when production data exists
// Expected Supabase shape: { id, email, created_at, family_id, role }
// Expected Convex destination: users table (see convex/schema.ts)
//
// Steps to implement:
//   1. Fetch all rows from Supabase `users` table using the service-role key.
//   2. For each row, call the Convex `users:importLegacyUser` mutation (create it).
//   3. Log progress and any skipped/failed rows.
//   4. Exit non-zero if any row fails so the caller knows migration is incomplete.

console.log("TODO: implement migrate-users when production data exists");
