import { MatcherType, SelectorKind } from "../../types/rule.js";

import type { CalleeSelector, Selectors } from "../../types/rule.js";


export const DCNB_STRINGS = {
  kind: SelectorKind.Callee,
  match: [
    {
      type: MatcherType.String
    }
  ],
  name: "^dcnb$"
} satisfies CalleeSelector;

export const DCNB_OBJECT_KEYS = {
  kind: SelectorKind.Callee,
  match: [
    {
      type: MatcherType.ObjectKey
    }
  ],
  name: "^dcnb$"
} satisfies CalleeSelector;

/** @see https://github.com/xobotyi/cnbuilder */
export const DCNB = [
  DCNB_STRINGS,
  DCNB_OBJECT_KEYS
] satisfies Selectors;
