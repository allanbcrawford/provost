"use node";

// One-time backfill that mirrors the production family-upload flow for the
// Williams demo PDFs. Production path is:
//   1. client requests `documents.uploadUrl` → POSTs blob to Convex storage,
//   2. client calls `documents.create({ storageId, fileName, ... })` so the
//      row's `file_id` points at the stored blob,
//   3. server-side text extraction populates `pages` for semantic search.
//
// This action does (1)–(3) server-side: fetches each Williams PDF from a
// public URL, stores it in `_storage`, parses with `pdf-parse`, and patches
// the matching seeded document row + inserts per-page text. Idempotent —
// skips rows that already have `file_id`.
//
// Run after `seed.ts` has populated the documents table:
//   npx convex run williamsBackfill:uploadAll '{"baseUrl":"https://provost-nine.vercel.app"}'
//
// Once both dev and prod have been backfilled, delete this file and the
// static PDFs at `apps/web/public/williams-docs/`.

import { v } from "convex/values";
import pdfParse from "pdf-parse";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

// All file names live in `apps/web/public/williams-docs/`. Match the seed
// JSON's `file_name` values exactly so the backfill can join on `name +
// type` since seed strips file_id at insert time.
const PDF_FILES = [
  "DAVID R. WILLIAMS 2025 GRANTOR RETAINED ANNUITY TRUST (GRAT).pdf",
  "IRREVOCABLE LIFE INSURANCE TRUST AGREEMENT.pdf",
  "LAST WILL AND TESTAMENT OF ROBERT JAMES WILLIAMS.pdf",
  "LETTER OF INTENT _ ETHICAL WILL OF ROBERT JAMES WILLIAMS.pdf",
  "REVOCABLE LIVING TRUST AGREEMENT.pdf",
  "ROBERT & LINDA WILLIAMS CHARITABLE REMAINDER UNITRUST (CRUT) - Google Docs.pdf",
  "WILLIAMS FAMILY CONSTITUTION.pdf",
  "WILLIAMS FAMILY DYNASTY TRUST AGREEMENT.pdf",
  "WILLIAMS FAMILY GOVERNANCE CHARTER.pdf",
  "Williams Family Limited Partnership (FLP) _ Family LLC.pdf",
  "Williams Family Pour-Over Will.pdf",
  "Williams Intentionally Defective Grantor Trust (IDGT).pdf",
] as const;

// Maps the legacy `file_name` (verbatim from seed JSON) → matching document
// row's `name`. Hand-authored once; future uploads use the real flow.
const FILE_TO_DOC_NAME: Record<string, string> = {
  "DAVID R. WILLIAMS 2025 GRANTOR RETAINED ANNUITY TRUST (GRAT).pdf":
    "David R. Williams 2025 Grantor Retained Annuity Trust (GRAT)",
  "IRREVOCABLE LIFE INSURANCE TRUST AGREEMENT.pdf":
    "Irrevocable Life Insurance Trust Agreement of Robert Williams",
  "LAST WILL AND TESTAMENT OF ROBERT JAMES WILLIAMS.pdf":
    "Last Will and Testament of Robert James Williams",
  "LETTER OF INTENT _ ETHICAL WILL OF ROBERT JAMES WILLIAMS.pdf":
    "Letter of Intent / Ethical Will of Robert James Williams",
  "REVOCABLE LIVING TRUST AGREEMENT.pdf": "Revocable Living Trust Agreement of Robert Williams",
  "ROBERT & LINDA WILLIAMS CHARITABLE REMAINDER UNITRUST (CRUT) - Google Docs.pdf":
    "THE ROBERT & LINDA WILLIAMS CHARITABLE REMAINDER UNITRUST (CRUT)",
  "WILLIAMS FAMILY CONSTITUTION.pdf": "THE WILLIAMS FAMILY CONSTITUTION",
  "WILLIAMS FAMILY DYNASTY TRUST AGREEMENT.pdf": "Williams Family Dynasty Trust Agreement",
  "WILLIAMS FAMILY GOVERNANCE CHARTER.pdf": "THE WILLIAMS FAMILY GOVERNANCE CHARTER",
  "Williams Family Limited Partnership (FLP) _ Family LLC.pdf":
    "The Williams Family Limited Partnership (FLP) / Family LLC Operating Agreement",
  "Williams Family Pour-Over Will.pdf": "The Williams Family Pour-Over Will",
  "Williams Intentionally Defective Grantor Trust (IDGT).pdf":
    "The Williams Intentionally Defective Grantor Trust (IDGT)",
};

// Helpers (queries / mutations) live in `williamsBackfillInternal.ts` so
// they run in the V8 runtime — Node-runtime modules cannot define them.

// Public action. Default `baseUrl` works for production; pass a different
// `baseUrl` for local dev (e.g. http://localhost:3000).
export const uploadAll = internalAction({
  args: {
    baseUrl: v.optional(v.string()),
    overwrite: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    Array<{
      file: string;
      docName: string;
      status: "patched" | "skipped" | "missing-doc" | "missing-pdf";
      pages?: number;
    }>
  > => {
    const baseUrl = (args.baseUrl ?? "https://provost-nine.vercel.app").replace(/\/+$/, "");
    const overwrite = args.overwrite ?? false;
    const results: Array<{
      file: string;
      docName: string;
      status: "patched" | "skipped" | "missing-doc" | "missing-pdf";
      pages?: number;
    }> = [];

    for (const fileName of PDF_FILES) {
      const docName = FILE_TO_DOC_NAME[fileName];
      if (!docName) {
        results.push({ file: fileName, docName: "", status: "missing-doc" });
        continue;
      }

      const doc: Doc<"documents"> | null = await ctx.runQuery(
        internal.williamsBackfillInternal.findDocumentByName,
        { name: docName },
      );
      if (!doc) {
        results.push({ file: fileName, docName, status: "missing-doc" });
        continue;
      }
      if (doc.file_id && !overwrite) {
        results.push({ file: fileName, docName, status: "skipped" });
        continue;
      }

      const url = `${baseUrl}/williams-docs/${encodeURIComponent(fileName)}`;
      const res = await fetch(url);
      if (!res.ok) {
        results.push({ file: fileName, docName, status: "missing-pdf" });
        continue;
      }
      const buf = await res.arrayBuffer();
      const blob = new Blob([buf], { type: "application/pdf" });

      const adminUserId: Id<"users"> | null = await ctx.runQuery(
        internal.williamsBackfillInternal.findFamilyAdmin,
        { familyId: doc.family_id },
      );
      if (!adminUserId) {
        results.push({ file: fileName, docName, status: "missing-doc" });
        continue;
      }

      const storageId: Id<"_storage"> = await ctx.storage.store(blob);

      // SHA-256 hash of the bytes — matches the production upload's
      // `fileHash` so downstream dedup/audit logic behaves identically.
      const hashBuf = await crypto.subtle.digest("SHA-256", buf);
      const hashHex = Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      await ctx.runMutation(internal.williamsBackfillInternal.linkDocumentFile, {
        documentId: doc._id,
        userId: adminUserId,
        storageId,
        fileName,
        fileType: "application/pdf",
        fileSize: buf.byteLength,
        fileHash: hashHex,
      });

      // pdf-parse v1's `pagerender` hook: invoked once per page with a
      // pdf.js page proxy. Capture each page separately so we can match
      // the schema's per-page rows (rather than the lib's default merged
      // text). The returned string is what gets concatenated into the
      // top-level `text` field, which we ignore.
      const pages: Array<{ index: number; content: string }> = [];
      let pageIndex = 0;
      await pdfParse(Buffer.from(buf), {
        pagerender: async (pageData: {
          getTextContent: (opts: {
            normalizeWhitespace: boolean;
            disableCombineTextItems: boolean;
          }) => Promise<{ items: Array<{ str: string }> }>;
        }) => {
          const text = await pageData.getTextContent({
            normalizeWhitespace: true,
            disableCombineTextItems: false,
          });
          const content = text.items
            .map((item) => item.str)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          pages.push({ index: pageIndex++, content });
          return content;
        },
      });

      await ctx.runMutation(internal.williamsBackfillInternal.replacePages, {
        documentId: doc._id,
        pages,
      });

      results.push({ file: fileName, docName, status: "patched", pages: pages.length });
    }

    return results;
  },
});

// Dry-run preview — reports which docs would be patched without doing any
// uploads. Useful to confirm the FILE_TO_DOC_NAME map before running.
export const preview = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<
    Array<{ file: string; docName: string; matched: boolean; alreadyHasFile: boolean }>
  > => {
    const out: Array<{
      file: string;
      docName: string;
      matched: boolean;
      alreadyHasFile: boolean;
    }> = [];
    for (const fileName of PDF_FILES) {
      const docName = FILE_TO_DOC_NAME[fileName] ?? "";
      if (!docName) {
        out.push({ file: fileName, docName: "", matched: false, alreadyHasFile: false });
        continue;
      }
      const doc: Doc<"documents"> | null = await ctx.runQuery(
        internal.williamsBackfillInternal.findDocumentByName,
        { name: docName },
      );
      out.push({
        file: fileName,
        docName,
        matched: doc !== null,
        alreadyHasFile: Boolean(doc?.file_id),
      });
    }
    return out;
  },
});
