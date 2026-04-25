/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as __tests____helpers from "../__tests__/_helpers.js";
import type * as acl from "../acl.js";
import type * as aclBackfill from "../aclBackfill.js";
import type * as agent_approvals from "../agent/approvals.js";
import type * as agent_digest from "../agent/digest.js";
import type * as agent_digestInternal from "../agent/digestInternal.js";
import type * as agent_embed from "../agent/embed.js";
import type * as agent_embedInternal from "../agent/embedInternal.js";
import type * as agent_knowledgeHydrate from "../agent/knowledgeHydrate.js";
import type * as agent_memoriesInternal from "../agent/memoriesInternal.js";
import type * as agent_openai from "../agent/openai.js";
import type * as agent_promptSuggestions from "../agent/promptSuggestions.js";
import type * as agent_prompts from "../agent/prompts.js";
import type * as agent_run from "../agent/run.js";
import type * as agent_runActions from "../agent/runActions.js";
import type * as agent_runInternal from "../agent/runInternal.js";
import type * as agent_summarize from "../agent/summarize.js";
import type * as agent_summarizeInternal from "../agent/summarizeInternal.js";
import type * as agent_tools_assignLesson from "../agent/tools/assignLesson.js";
import type * as agent_tools_attachFile from "../agent/tools/attachFile.js";
import type * as agent_tools_attachFileInternal from "../agent/tools/attachFileInternal.js";
import type * as agent_tools_createTask from "../agent/tools/createTask.js";
import type * as agent_tools_draftRevision from "../agent/tools/draftRevision.js";
import type * as agent_tools_explainDocument from "../agent/tools/explainDocument.js";
import type * as agent_tools_form from "../agent/tools/form.js";
import type * as agent_tools_formResume from "../agent/tools/formResume.js";
import type * as agent_tools_formSubmit from "../agent/tools/formSubmit.js";
import type * as agent_tools_generateSignals from "../agent/tools/generateSignals.js";
import type * as agent_tools_inviteMember from "../agent/tools/inviteMember.js";
import type * as agent_tools_listObservations from "../agent/tools/listObservations.js";
import type * as agent_tools_navigate from "../agent/tools/navigate.js";
import type * as agent_tools_recommendLesson from "../agent/tools/recommendLesson.js";
import type * as agent_tools_remember from "../agent/tools/remember.js";
import type * as agent_tools_renderFamilyGraph from "../agent/tools/renderFamilyGraph.js";
import type * as agent_tools_renderWaterfallSimulation from "../agent/tools/renderWaterfallSimulation.js";
import type * as agent_tools_searchKnowledge from "../agent/tools/searchKnowledge.js";
import type * as agent_tools_searchLibrary from "../agent/tools/searchLibrary.js";
import type * as agent_tools_summarizeLesson from "../agent/tools/summarizeLesson.js";
import type * as assets from "../assets.js";
import type * as bookmarks from "../bookmarks.js";
import type * as bootstrap from "../bootstrap.js";
import type * as bootstrapInternal from "../bootstrapInternal.js";
import type * as compliance from "../compliance.js";
import type * as crons from "../crons.js";
import type * as documents from "../documents.js";
import type * as events from "../events.js";
import type * as families from "../families.js";
import type * as family from "../family.js";
import type * as files from "../files.js";
import type * as governance from "../governance.js";
import type * as guardrails from "../guardrails.js";
import type * as learningBackfill from "../learningBackfill.js";
import type * as lessonDelivery from "../lessonDelivery.js";
import type * as lessons from "../lessons.js";
import type * as lib_acl from "../lib/acl.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_authz from "../lib/authz.js";
import type * as lib_log from "../lib/log.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_signalRules from "../lib/signalRules.js";
import type * as library from "../library.js";
import type * as messages from "../messages.js";
import type * as observations from "../observations.js";
import type * as professionals from "../professionals.js";
import type * as programs from "../programs.js";
import type * as promptSuggestionsRead from "../promptSuggestionsRead.js";
import type * as quizzes from "../quizzes.js";
import type * as runs from "../runs.js";
import type * as schema_parts_acl from "../schema_parts/acl.js";
import type * as schema_parts_chat from "../schema_parts/chat.js";
import type * as schema_parts_core from "../schema_parts/core.js";
import type * as schema_parts_domain from "../schema_parts/domain.js";
import type * as schema_parts_events from "../schema_parts/events.js";
import type * as schema_parts_learning from "../schema_parts/learning.js";
import type * as schema_parts_messages from "../schema_parts/messages.js";
import type * as schema_parts_platform from "../schema_parts/platform.js";
import type * as seed from "../seed.js";
import type * as signals from "../signals.js";
import type * as simulations from "../simulations.js";
import type * as tasks from "../tasks.js";
import type * as threads from "../threads.js";
import type * as tracks from "../tracks.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "__tests__/_helpers": typeof __tests____helpers;
  acl: typeof acl;
  aclBackfill: typeof aclBackfill;
  "agent/approvals": typeof agent_approvals;
  "agent/digest": typeof agent_digest;
  "agent/digestInternal": typeof agent_digestInternal;
  "agent/embed": typeof agent_embed;
  "agent/embedInternal": typeof agent_embedInternal;
  "agent/knowledgeHydrate": typeof agent_knowledgeHydrate;
  "agent/memoriesInternal": typeof agent_memoriesInternal;
  "agent/openai": typeof agent_openai;
  "agent/promptSuggestions": typeof agent_promptSuggestions;
  "agent/prompts": typeof agent_prompts;
  "agent/run": typeof agent_run;
  "agent/runActions": typeof agent_runActions;
  "agent/runInternal": typeof agent_runInternal;
  "agent/summarize": typeof agent_summarize;
  "agent/summarizeInternal": typeof agent_summarizeInternal;
  "agent/tools/assignLesson": typeof agent_tools_assignLesson;
  "agent/tools/attachFile": typeof agent_tools_attachFile;
  "agent/tools/attachFileInternal": typeof agent_tools_attachFileInternal;
  "agent/tools/createTask": typeof agent_tools_createTask;
  "agent/tools/draftRevision": typeof agent_tools_draftRevision;
  "agent/tools/explainDocument": typeof agent_tools_explainDocument;
  "agent/tools/form": typeof agent_tools_form;
  "agent/tools/formResume": typeof agent_tools_formResume;
  "agent/tools/formSubmit": typeof agent_tools_formSubmit;
  "agent/tools/generateSignals": typeof agent_tools_generateSignals;
  "agent/tools/inviteMember": typeof agent_tools_inviteMember;
  "agent/tools/listObservations": typeof agent_tools_listObservations;
  "agent/tools/navigate": typeof agent_tools_navigate;
  "agent/tools/recommendLesson": typeof agent_tools_recommendLesson;
  "agent/tools/remember": typeof agent_tools_remember;
  "agent/tools/renderFamilyGraph": typeof agent_tools_renderFamilyGraph;
  "agent/tools/renderWaterfallSimulation": typeof agent_tools_renderWaterfallSimulation;
  "agent/tools/searchKnowledge": typeof agent_tools_searchKnowledge;
  "agent/tools/searchLibrary": typeof agent_tools_searchLibrary;
  "agent/tools/summarizeLesson": typeof agent_tools_summarizeLesson;
  assets: typeof assets;
  bookmarks: typeof bookmarks;
  bootstrap: typeof bootstrap;
  bootstrapInternal: typeof bootstrapInternal;
  compliance: typeof compliance;
  crons: typeof crons;
  documents: typeof documents;
  events: typeof events;
  families: typeof families;
  family: typeof family;
  files: typeof files;
  governance: typeof governance;
  guardrails: typeof guardrails;
  learningBackfill: typeof learningBackfill;
  lessonDelivery: typeof lessonDelivery;
  lessons: typeof lessons;
  "lib/acl": typeof lib_acl;
  "lib/audit": typeof lib_audit;
  "lib/authz": typeof lib_authz;
  "lib/log": typeof lib_log;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/signalRules": typeof lib_signalRules;
  library: typeof library;
  messages: typeof messages;
  observations: typeof observations;
  professionals: typeof professionals;
  programs: typeof programs;
  promptSuggestionsRead: typeof promptSuggestionsRead;
  quizzes: typeof quizzes;
  runs: typeof runs;
  "schema_parts/acl": typeof schema_parts_acl;
  "schema_parts/chat": typeof schema_parts_chat;
  "schema_parts/core": typeof schema_parts_core;
  "schema_parts/domain": typeof schema_parts_domain;
  "schema_parts/events": typeof schema_parts_events;
  "schema_parts/learning": typeof schema_parts_learning;
  "schema_parts/messages": typeof schema_parts_messages;
  "schema_parts/platform": typeof schema_parts_platform;
  seed: typeof seed;
  signals: typeof signals;
  simulations: typeof simulations;
  tasks: typeof tasks;
  threads: typeof threads;
  tracks: typeof tracks;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
