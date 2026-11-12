import type { Expression, SourceLocation } from "estree";


// Stand-in for the subset of the svelte-eslint-parser AST that the vendored code relies on.
// src/svelte.ts converts the AST of the Svelte compiler into this shape.

interface Located {
  loc: SourceLocation;
  range: [number, number];
}

interface SvelteParent extends Located {
  type: string;
}

export interface SvelteName extends Located {
  name: string;
  parent: SvelteParent;
  type: "SvelteName";
}

export interface SvelteLiteral extends Located {
  parent: SvelteParent;
  type: "SvelteLiteral";
  value: string;
}

export interface SvelteMustacheTagText extends Located {
  expression: Expression;
  kind: "text";
  parent: SvelteParent;
  type: "SvelteMustacheTag";
}

export interface SvelteAttribute extends Located {
  key: SvelteName;
  parent: SvelteParent;
  type: "SvelteAttribute";
  value: (SvelteLiteral | SvelteMustacheTagText)[];
}

export interface SvelteDirectiveKey extends Located {
  name: SvelteName;
  parent: SvelteParent;
  type: "SvelteDirectiveKey";
}

export interface SvelteDirective extends Located {
  expression: Expression | null;
  key: SvelteDirectiveKey;
  kind: "Class";
  parent: SvelteParent;
  type: "SvelteDirective";
}

interface SvelteUnsupportedAttribute extends Located {
  type: string;
}

export type SvelteAttachTag = SvelteUnsupportedAttribute;
export type SvelteGenericsDirective = SvelteUnsupportedAttribute;
export type SvelteShorthandAttribute = SvelteUnsupportedAttribute;
export type SvelteSpecialDirective = SvelteUnsupportedAttribute;
export type SvelteSpreadAttribute = SvelteUnsupportedAttribute;
export type SvelteStyleDirective = SvelteUnsupportedAttribute;

export interface SvelteStartTag extends Located {
  attributes: (SvelteAttribute | SvelteDirective | SvelteUnsupportedAttribute)[];
  parent: SvelteParent;
  type: "SvelteStartTag";
}
