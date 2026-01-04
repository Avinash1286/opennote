/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as capsuleGeneration from "../capsuleGeneration.js";
import type * as capsules from "../capsules.js";
import type * as chat from "../chat.js";
import type * as chatActions from "../chatActions.js";
import type * as flashcards from "../flashcards.js";
import type * as simulations from "../simulations.js";
import type * as simulationsMutations from "../simulationsMutations.js";
import type * as videos from "../videos.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  capsuleGeneration: typeof capsuleGeneration;
  capsules: typeof capsules;
  chat: typeof chat;
  chatActions: typeof chatActions;
  flashcards: typeof flashcards;
  simulations: typeof simulations;
  simulationsMutations: typeof simulationsMutations;
  videos: typeof videos;
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
