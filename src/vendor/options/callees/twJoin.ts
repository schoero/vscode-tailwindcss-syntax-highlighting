import { MatcherType, SelectorKind } from "../../types/rule.js";

import type { CalleeSelector, Selectors } from "../../types/rule.js";


export const TW_JOIN_STRINGS = {
  kind: SelectorKind.Callee,
  match: [
    {
      type: MatcherType.String
    }
  ],
  name: "^twJoin$"
} satisfies CalleeSelector;

/** @see https://github.com/dcastil/tailwind-merge */
export const TW_JOIN = [
  TW_JOIN_STRINGS
] satisfies Selectors;
