// TODO: implement when production data exists
// Expected Supabase shape: { id, owner_id, type, content, created_at, updated_at }
// Expected Convex destination: documents table (see convex/schema.ts)
//
// Steps to implement:
//   1. Fetch all rows from Supabase `documents` table using the service-role key.
//   2. Resolve each `owner_id` to the migrated Convex user id (run migrate-users first).
//   3. For each row, call the Convex `documents:importLegacyDocument` mutation (create it).
//   4. Log progress and any skipped/failed rows.
//   5. Exit non-zero if any row fails so the caller knows migration is incomplete.

console.log("TODO: implement migrate-documents when production data exists");
