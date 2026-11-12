export enum MatcherType {
  /** Matches return values of anonymous functions via nested matchers. */
  AnonymousFunctionReturn = "anonymousFunctionReturn",
  /** Matches all object keys that are strings. */
  ObjectKey = "objectKeys",
  /** Matches all object values that are strings. */
  ObjectValue = "objectValues",
  /** Matches all strings  that are not matched by another matcher. */
  String = "strings"
}

export enum SelectorKind {
  Attribute = "attribute",
  Callee = "callee",
  Tag = "tag",
  Variable = "variable"
}

export type Regex = string;

/* Legacy matchers */

export type StringMatcher = {
  match: MatcherType.String;
};

export type ObjectKeyMatcher = {
  match: MatcherType.ObjectKey;
  pathPattern?: Regex | undefined;
};

export type ObjectValueMatcher = {
  match: MatcherType.ObjectValue;
  pathPattern?: Regex | undefined;
};

export const MATCHER_RESULT = {
  MATCH: true,
  NO_MATCH: false,
  UNCROSSABLE_BOUNDARY: "UNCROSSABLE_BOUNDARY"
} as const;
type MatcherFunctionResult = typeof MATCHER_RESULT[keyof typeof MATCHER_RESULT];

export type MatcherFunction = (node: unknown) => MatcherFunctionResult | MatcherFunctions;
export type MatcherFunctions = MatcherFunction[];
export type Matcher = ObjectKeyMatcher | ObjectValueMatcher | StringMatcher;

/* New selector matchers */

export type SelectorStringMatcher = {
  type: MatcherType.String;
};

export type SelectorAnonymousFunctionReturnMatcher = {
  match: (SelectorObjectKeyMatcher | SelectorObjectValueMatcher | SelectorStringMatcher)[];
  type: MatcherType.AnonymousFunctionReturn;
};

export type SelectorObjectKeyMatcher = {
  type: MatcherType.ObjectKey;
  path?: Regex | undefined;
};

export type SelectorObjectValueMatcher = {
  type: MatcherType.ObjectValue;
  path?: Regex | undefined;
};

export type SelectorMatcher =
  | SelectorAnonymousFunctionReturnMatcher
  | SelectorObjectKeyMatcher
  | SelectorObjectValueMatcher
  | SelectorStringMatcher;

type BaseSelector<Kind extends SelectorKind> = {
  kind: Kind;
  name: Regex;
  match?: SelectorMatcher[] | undefined;
};

export type Target = "all" | "first" | "last" | number;
export type CallTarget = Target;
export type ArgumentTarget = Target;

export type AttributeSelector = BaseSelector<SelectorKind.Attribute>;

export type CalleeSelector = {
  kind: SelectorKind.Callee;
  /** @deprecated Use targetCall instead. */
  callTarget?: CallTarget | undefined;
  match?: SelectorMatcher[] | undefined;
  name?: Regex | undefined;
  path?: Regex | undefined;
  targetArgument?: ArgumentTarget | undefined;
  targetCall?: CallTarget | undefined;
};

export type TagSelector = {
  kind: SelectorKind.Tag;
  match?: SelectorMatcher[] | undefined;
  name?: Regex | undefined;
  path?: Regex | undefined;
};

export type VariableSelector = BaseSelector<SelectorKind.Variable>;

export type Selector = AttributeSelector | CalleeSelector | TagSelector | VariableSelector;
export type Selectors = Selector[];

export type SelectorByKind<Kind extends SelectorKind> = Extract<Selector, { kind: Kind; }>;
