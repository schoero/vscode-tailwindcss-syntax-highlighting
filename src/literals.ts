import { LINE_BREAK } from "./parsers/prepare.js";
import { getLiteralsByCSSAtRule } from "./vendor/parsers/css.js";
import {
  getLiteralsByESBareTemplateLiteral,
  getLiteralsByESCallExpression,
  getLiteralsByESExportDefaultDeclaration,
  getLiteralsByESVariableDeclarator,
  getLiteralsByTaggedTemplateExpression
} from "./vendor/parsers/es.js";
import { getAttributesByHTMLTag, getLiteralsByHTMLAttribute } from "./vendor/parsers/html.js";
import { getAttributesByJSXElement, getLiteralsByJSXAttribute } from "./vendor/parsers/jsx.js";
import {
  getAttributesBySvelteTag,
  getDirectivesBySvelteTag,
  getLiteralsBySvelteAttribute,
  getLiteralsBySvelteDirective
} from "./vendor/parsers/svelte.js";
import { getAttributesByVueStartTag, getLiteralsByVueAttribute } from "./vendor/parsers/vue.js";

import type { Atrule } from "@eslint/css-tree";
import type { TagNode } from "es-html-parser";
import type { Node } from "estree";
import type { JSXOpeningElement } from "estree-jsx";

import type { Comment } from "./parsers/es.js";
import type { PreparedScript } from "./parsers/prepare.js";
import type { Literal } from "./vendor/types/ast.js";
import type { Rule } from "./vendor/types/eslint.js";
import type {
  AttributeSelector,
  CalleeSelector,
  Selectors,
  TagSelector,
  VariableSelector
} from "./vendor/types/rule.js";
import type { SvelteStartTag } from "./vendor/types/svelte.js";
import type { AST as VueAST } from "./vendor/types/vue.js";


/** Offsets of the class content of a literal in the document, without quotes and template braces. */
export interface ContentRange {
  end: number;
  start: number;
}

interface GroupedSelectors {
  attribute: AttributeSelector[];
  callee: CalleeSelector[];
  tag: TagSelector[];
  variable: VariableSelector[];
}


export function getContentRanges(text: string, scripts: PreparedScript[], selectors: Selectors): ContentRange[] {
  const lines = text.split(LINE_BREAK);
  const grouped = groupSelectors(selectors);
  const ranges = new Map<number, ContentRange>();

  for(const script of scripts){
    const ctx = createContext(text, lines, script.comments);

    for(const node of script.nodes){
      for(const literal of getLiteralsByNode(ctx, node, grouped)){
        const start = literal.range[0] + (literal.openingQuote?.length ?? 0) + (literal.closingBraces?.length ?? 0);
        ranges.set(start, { end: start + literal.content.length, start });
      }
    }
  }

  return [...ranges.values()].sort((a, b) => a.start - b.start);
}

function groupSelectors(selectors: Selectors): GroupedSelectors {
  const grouped: GroupedSelectors = { attribute: [], callee: [], tag: [], variable: [] };
  for(const selector of selectors){
    (grouped[selector.kind] as typeof selector[]).push(selector);
  }
  return grouped;
}

function getLiteralsByNode(ctx: Rule.RuleContext, node: Node, selectors: GroupedSelectors): Literal[] {
  switch (node.type as string){
    case "CallExpression":
      return getLiteralsByESCallExpression(ctx, node as any, selectors.callee);
    case "VariableDeclarator":
      return getLiteralsByESVariableDeclarator(ctx, node as any, selectors.variable);
    case "ExportDefaultDeclaration":
      return getLiteralsByESExportDefaultDeclaration(ctx, node as any, selectors.variable);
    case "TaggedTemplateExpression":
      return getLiteralsByTaggedTemplateExpression(ctx, node as any, selectors.tag);
    case "TemplateLiteral":
      return getLiteralsByESBareTemplateLiteral(ctx, node as any, selectors.tag);
    case "JSXOpeningElement":
      return getAttributesByJSXElement(ctx, node as unknown as JSXOpeningElement)
        .flatMap(attribute => getLiteralsByJSXAttribute(ctx, attribute, selectors.attribute));
    case "SvelteStartTag":
      return [
        ...getAttributesBySvelteTag(ctx, node as unknown as SvelteStartTag)
          .flatMap(attribute => getLiteralsBySvelteAttribute(ctx, attribute, selectors.attribute)),
        ...getDirectivesBySvelteTag(ctx, node as unknown as SvelteStartTag)
          .flatMap(directive => getLiteralsBySvelteDirective(ctx, directive, selectors.attribute))
      ];
    case "Tag":
      return getAttributesByHTMLTag(ctx, node as unknown as TagNode)
        .flatMap(attribute => getLiteralsByHTMLAttribute(ctx, attribute, selectors.attribute));
    case "Atrule":
      return getLiteralsByCSSAtRule(ctx, node as unknown as Atrule);
    case "VStartTag":
      return getAttributesByVueStartTag(ctx, node as unknown as VueAST.VStartTag)
        .flatMap(attribute => getLiteralsByVueAttribute(ctx, attribute, selectors.attribute));
    default:
      return [];
  }
}


function createContext(text: string, lines: string[], comments: Comment[]): Rule.RuleContext {
  return {
    sourceCode: {
      getAncestors: node => {
        const ancestors: Node[] = [];
        for(let parent = (node as Rule.Node).parent; parent; parent = parent.parent){
          ancestors.unshift(parent);
        }
        return ancestors;
      },
      getRange: node => node.range!,
      getText: (node, beforeCount = 0, afterCount = 0) => {
        if(!node?.range){ return text; }
        return text.slice(node.range[0] - beforeCount, node.range[1] + afterCount);
      },
      // Only used to find a comment directly in front of a bare template literal, e.g. `/* tw */ \`...\``
      getTokenBefore: node => {
        const start = (node as { range?: [number, number]; }).range?.[0];
        if(start === undefined){ return null; }

        const comment = comments.findLast(comment => comment.end <= start);
        if(!comment || text.slice(comment.end, start).trim() !== ""){ return null; }

        return { type: comment.type, value: comment.value };
      },
      lines
    }
  };
}
