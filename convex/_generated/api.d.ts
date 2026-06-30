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
import type * as aiRateLimit from "../aiRateLimit.js";
import type * as aiResponseCache from "../aiResponseCache.js";
import type * as aiUsageAnalytics from "../aiUsageAnalytics.js";
import type * as answerQuality from "../answerQuality.js";
import type * as assistantIdentity from "../assistantIdentity.js";
import type * as attachmentValidation from "../attachmentValidation.js";
import type * as auth from "../auth.js";
import type * as authActions from "../authActions.js";
import type * as authRateLimit from "../authRateLimit.js";
import type * as chat from "../chat.js";
import type * as chatEngine from "../chatEngine.js";
import type * as conversations from "../conversations.js";
import type * as creatorProfiles from "../creatorProfiles.js";
import type * as creditPacks from "../creditPacks.js";
import type * as credits from "../credits.js";
import type * as creditsConfig from "../creditsConfig.js";
import type * as crons from "../crons.js";
import type * as falClient from "../falClient.js";
import type * as geminiImageClient from "../geminiImageClient.js";
import type * as http from "../http.js";
import type * as marketplace from "../marketplace.js";
import type * as marketplacePayments from "../marketplacePayments.js";
import type * as media from "../media.js";
import type * as mediaCatalog from "../mediaCatalog.js";
import type * as mediaCredits from "../mediaCredits.js";
import type * as mediaEngine from "../mediaEngine.js";
import type * as mediaFal from "../mediaFal.js";
import type * as mediaInternal from "../mediaInternal.js";
import type * as mediaQueries from "../mediaQueries.js";
import type * as mediaStorage from "../mediaStorage.js";
import type * as mediaUtils from "../mediaUtils.js";
import type * as messages from "../messages.js";
import type * as openaiImageClient from "../openaiImageClient.js";
import type * as payments from "../payments.js";
import type * as paystack from "../paystack.js";
import type * as paystackConfig from "../paystackConfig.js";
import type * as platform from "../platform.js";
import type * as platformActions from "../platformActions.js";
import type * as providerRouter from "../providerRouter.js";
import type * as qualityDashboard from "../qualityDashboard.js";
import type * as replicateClient from "../replicateClient.js";
import type * as securityErrors from "../securityErrors.js";
import type * as securityHelpers from "../securityHelpers.js";
import type * as securityMonitoring from "../securityMonitoring.js";
import type * as sessionAuth from "../sessionAuth.js";
import type * as stripeActions from "../stripeActions.js";
import type * as subscriptionPlans from "../subscriptionPlans.js";
import type * as subscriptions from "../subscriptions.js";
import type * as supabaseAuth from "../supabaseAuth.js";
import type * as uploadLimits from "../uploadLimits.js";
import type * as userIds from "../userIds.js";
import type * as userLearning from "../userLearning.js";
import type * as userStarterCredits from "../userStarterCredits.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";
import type * as videoAI from "../videoAI.js";
import type * as videoCatalog from "../videoCatalog.js";
import type * as videoCredits from "../videoCredits.js";
import type * as videoCreditsConfig from "../videoCreditsConfig.js";
import type * as videoInternal from "../videoInternal.js";
import type * as videoPlans from "../videoPlans.js";
import type * as videoQueries from "../videoQueries.js";
import type * as webSearch from "../webSearch.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiActions: typeof aiActions;
  aiModes: typeof aiModes;
  aiRateLimit: typeof aiRateLimit;
  aiResponseCache: typeof aiResponseCache;
  aiUsageAnalytics: typeof aiUsageAnalytics;
  answerQuality: typeof answerQuality;
  assistantIdentity: typeof assistantIdentity;
  attachmentValidation: typeof attachmentValidation;
  auth: typeof auth;
  authActions: typeof authActions;
  authRateLimit: typeof authRateLimit;
  chat: typeof chat;
  chatEngine: typeof chatEngine;
  conversations: typeof conversations;
  creatorProfiles: typeof creatorProfiles;
  creditPacks: typeof creditPacks;
  credits: typeof credits;
  creditsConfig: typeof creditsConfig;
  crons: typeof crons;
  falClient: typeof falClient;
  geminiImageClient: typeof geminiImageClient;
  http: typeof http;
  marketplace: typeof marketplace;
  marketplacePayments: typeof marketplacePayments;
  media: typeof media;
  mediaCatalog: typeof mediaCatalog;
  mediaCredits: typeof mediaCredits;
  mediaEngine: typeof mediaEngine;
  mediaFal: typeof mediaFal;
  mediaInternal: typeof mediaInternal;
  mediaQueries: typeof mediaQueries;
  mediaStorage: typeof mediaStorage;
  mediaUtils: typeof mediaUtils;
  messages: typeof messages;
  openaiImageClient: typeof openaiImageClient;
  payments: typeof payments;
  paystack: typeof paystack;
  paystackConfig: typeof paystackConfig;
  platform: typeof platform;
  platformActions: typeof platformActions;
  providerRouter: typeof providerRouter;
  qualityDashboard: typeof qualityDashboard;
  replicateClient: typeof replicateClient;
  securityErrors: typeof securityErrors;
  securityHelpers: typeof securityHelpers;
  securityMonitoring: typeof securityMonitoring;
  sessionAuth: typeof sessionAuth;
  stripeActions: typeof stripeActions;
  subscriptionPlans: typeof subscriptionPlans;
  subscriptions: typeof subscriptions;
  supabaseAuth: typeof supabaseAuth;
  uploadLimits: typeof uploadLimits;
  userIds: typeof userIds;
  userLearning: typeof userLearning;
  userStarterCredits: typeof userStarterCredits;
  users: typeof users;
  validators: typeof validators;
  videoAI: typeof videoAI;
  videoCatalog: typeof videoCatalog;
  videoCredits: typeof videoCredits;
  videoCreditsConfig: typeof videoCreditsConfig;
  videoInternal: typeof videoInternal;
  videoPlans: typeof videoPlans;
  videoQueries: typeof videoQueries;
  webSearch: typeof webSearch;
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
