import { defineSchema } from "convex/server";
import { aclTables } from "./schema_parts/acl";
import { chatTables } from "./schema_parts/chat";
import { coreTables } from "./schema_parts/core";
import { domainTables } from "./schema_parts/domain";
import { eventTables } from "./schema_parts/events";
import { learningTables } from "./schema_parts/learning";
import { messageTables } from "./schema_parts/messages";
import { platformTables } from "./schema_parts/platform";

export default defineSchema({
  ...coreTables,
  ...chatTables,
  ...domainTables,
  ...platformTables,
  ...aclTables,
  ...learningTables,
  ...messageTables,
  ...eventTables,
});
