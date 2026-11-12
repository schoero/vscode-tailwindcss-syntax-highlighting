import type { Rule } from "./eslint.js";


type Nullable<Object extends object> = {
  [Key in keyof Object]: Object[Key] | null;
};


export type WithParent<BaseNode> = BaseNode & Nullable<Partial<Rule.NodeParentExtension>>;
