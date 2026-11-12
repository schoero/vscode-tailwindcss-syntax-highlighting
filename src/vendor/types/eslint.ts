import type { Node as ESNode } from "estree";


// Stand-in for the subset of ESLint's `Rule` types that the vendored code relies on,
// so the extension doesn't depend on eslint. The context is provided by src/literals.ts.

export interface SourceCodeToken {
  type: string;
  value?: string;
}

export interface SourceCode {
  lines: string[];
  getAncestors: (node: ESNode) => ESNode[];
  getRange: (node: ESNode) => [number, number];
  getText: (node?: { range?: undefined | [number, number]; }, beforeCount?: number, afterCount?: number) => string;
  getTokenBefore: (node: ESNode, options?: { includeComments?: boolean; }) => SourceCodeToken | null;
}

export declare namespace Rule {
  interface NodeParentExtension {
    parent: Node;
  }

  type Node = ESNode & NodeParentExtension;

  interface RuleContext {
    sourceCode: SourceCode;
  }
}
