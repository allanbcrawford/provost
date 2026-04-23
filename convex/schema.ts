import { defineSchema } from "convex/server";
import { chatTables } from "./schema_parts/chat";
import { coreTables } from "./schema_parts/core";
import { domainTables } from "./schema_parts/domain";
import { platformTables } from "./schema_parts/platform";

export default defineSchema({
  ...coreTables,
  ...chatTables,
  ...domainTables,
  ...platformTables,
});
