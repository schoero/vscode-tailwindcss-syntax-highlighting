import { parse } from "svelte/compiler";

import type { Program } from "estree";

import type { ParsedScript } from "./es.js";


type SvelteNode = Record<string, any>;

// Keys of the Svelte AST that hold positions or compiler state instead of child nodes.
const SKIPPED_KEYS = new Set(["loc", "metadata", "name_loc"]);

// Converts the tags into the shape of the svelte-eslint-parser AST, which the vendored code expects.
// Scripts are left out because they are parsed with oxc like any other file.
export function parseSvelteMarkup(text: string): ParsedScript | undefined {
  let root: SvelteNode;

  try {
    root = parse(text, { modern: true });
  } catch {
    return;
  }

  const visited = new WeakSet<object>();

  const convert = (node: unknown, parentRange: [number, number]) => {
    if(!node || typeof node !== "object" || visited.has(node)){ return; }
    visited.add(node);

    if(Array.isArray(node)){
      for(const child of node){ convert(child, parentRange); }
      return;
    }

    const record = node as SvelteNode;

    if(typeof record.type === "string"){
      // fragments have no position, but every node needs a range to be traversed
      record.range ??= typeof record.start === "number" ? [record.start, record.end] : parentRange;
    }

    // acorn excludes the backticks and braces of template elements, oxc includes them
    if(record.type === "TemplateLiteral"){
      for(const quasi of record.quasis){
        quasi.range = [quasi.start - 1, quasi.end + (quasi.tail ? 1 : 2)];
      }
    }

    for(const [key, value] of Object.entries(record)){
      if(!SKIPPED_KEYS.has(key)){ convert(value, record.range ?? parentRange); }
    }

    if(Array.isArray(record.attributes)){
      record.startTag = { attributes: record.attributes.map(convertAttribute), range: record.range, type: "SvelteStartTag" };
      delete record.attributes;
    }
  };

  const convertAttribute = (attribute: SvelteNode) => {
    // shorthand attributes like `{class}` are skipped by the vendored code
    if(attribute.type === "Attribute" && text[attribute.start] !== "{"){
      const values: SvelteNode[] = attribute.value === true ? [] : [attribute.value].flat();

      return {
        key: createName(attribute.name, attribute.start),
        range: attribute.range,
        type: "SvelteAttribute",
        value: values.map(value => value.type === "ExpressionTag"
          ? { expression: value.expression, kind: "text", range: value.range, type: "SvelteMustacheTag" }
          : { range: value.range, type: "SvelteLiteral", value: value.data })
      };
    }

    if(attribute.type === "ClassDirective"){
      const name = createName(attribute.name, attribute.start + "class:".length);

      return {
        expression: attribute.expression,
        key: { name, range: [attribute.start, name.range[1]], type: "SvelteDirectiveKey" },
        kind: "Class",
        range: attribute.range,
        type: "SvelteDirective"
      };
    }

    return attribute;
  };

  const markup = { fragment: root.fragment, range: [root.start, root.end], type: "SvelteMarkup" };
  convert(markup.fragment, markup.range as [number, number]);

  return { comments: [], program: markup as unknown as Program };
}

function createName(name: string, start: number) {
  return { name, range: [start, start + name.length], type: "SvelteName" };
}
