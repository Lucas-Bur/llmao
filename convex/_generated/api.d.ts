/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as data_prompts from "../data/prompts.js";
import type * as games from "../games.js";
import type * as lifecycle from "../lifecycle.js";
import type * as orchestrators from "../orchestrators.js";
import type * as players from "../players.js";
import type * as prompts from "../prompts.js";
import type * as ratings from "../ratings.js";
import type * as state_machine from "../state_machine.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "data/prompts": typeof data_prompts;
  games: typeof games;
  lifecycle: typeof lifecycle;
  orchestrators: typeof orchestrators;
  players: typeof players;
  prompts: typeof prompts;
  ratings: typeof ratings;
  state_machine: typeof state_machine;
  utils: typeof utils;
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
