/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as aiActions from "../aiActions.js";
import type * as aiModes from "../aiModes.js";
import type * as chat from "../chat.js";
import type * as chatEngine from "../chatEngine.js";
import type * as conversations from "../conversations.js";
import type * as creditPacks from "../creditPacks.js";
import type * as credits from "../credits.js";
import type * as creditsConfig from "../creditsConfig.js";
import type * as crons from "../crons.js";
import type * as falClient from "../falClient.js";
import type * as http from "../http.js";
import type * as media from "../media.js";
import type * as mediaCatalog from "../mediaCatalog.js";
import type * as mediaCredits from "../mediaCredits.js";
import type * as mediaEngine from "../mediaEngine.js";
import type * as mediaFal from "../mediaFal.js";
import type * as mediaInternal from "../mediaInternal.js";
import type * as mediaQueries from "../mediaQueries.js";
import type * as mediaUtils from "../mediaUtils.js";
import type * as messages from "../messages.js";
import type * as payments from "../payments.js";
import type * as paystack from "../paystack.js";
import type * as paystackConfig from "../paystackConfig.js";
import type * as platform from "../platform.js";
import type * as platformActions from "../platformActions.js";
import type * as replicateClient from "../replicateClient.js";
import type * as stripeActions from "../stripeActions.js";
import type * as subscriptionPlans from "../subscriptionPlans.js";
import type * as subscriptions from "../subscriptions.js";
import type * as userIds from "../userIds.js";
import type * as userLearning from "../userLearning.js";
import type * as userStarterCredits from "../userStarterCredits.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiActions: typeof aiActions;
  aiModes: typeof aiModes;
  chat: typeof chat;
  chatEngine: typeof chatEngine;
  conversations: typeof conversations;
  creditPacks: typeof creditPacks;
  credits: typeof credits;
  creditsConfig: typeof creditsConfig;
  crons: typeof crons;
  falClient: typeof falClient;
  http: typeof http;
  media: typeof media;
  mediaCatalog: typeof mediaCatalog;
  mediaCredits: typeof mediaCredits;
  mediaEngine: typeof mediaEngine;
  mediaFal: typeof mediaFal;
  mediaInternal: typeof mediaInternal;
  mediaQueries: typeof mediaQueries;
  mediaUtils: typeof mediaUtils;
  messages: typeof messages;
  payments: typeof payments;
  paystack: typeof paystack;
  paystackConfig: typeof paystackConfig;
  platform: typeof platform;
  platformActions: typeof platformActions;
  replicateClient: typeof replicateClient;
  stripeActions: typeof stripeActions;
  subscriptionPlans: typeof subscriptionPlans;
  subscriptions: typeof subscriptions;
  userIds: typeof userIds;
  userLearning: typeof userLearning;
  userStarterCredits: typeof userStarterCredits;
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
