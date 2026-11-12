import { visitorKeys } from "oxc-parser/src-js/wasm.js";

import type { Node } from "estree";

import type { Comment, ParsedScript } from "./es.js";


/** A script whose nodes carry `parent` and `loc` like they do inside ESLint, flattened in traversal order. */
export interface PreparedScript {
  comments: Comment[];
  nodes: Node[];
}

type PreparedNode = Record<string, unknown> & { range: [number, number]; type: string; };

export const LINE_BREAK = /\r\n|[\n\r\u2028\u2029]/g;

// The vendored code only reads `loc` of these nodes and their parents. Computing it for every node would
// double the time of `prepareNodes`. If a sync of the vendored code reads `loc` of other nodes, add them here.
const NODES_WITH_LOC = new Set(["Atrule", "Literal", "SvelteLiteral", "SvelteName", "TemplateElement", "VLiteral"]);

// oxc doesn't set `parent` or `loc` on nodes, but the vendored matchers depend on both,
// the same way they do inside ESLint. The scripts must be freshly parsed, because their nodes are annotated in place.
export function prepareScripts(text: string, scripts: ParsedScript[]): PreparedScript[] {
  const lineStarts = [0, ...[...text.matchAll(LINE_BREAK)].map(match => match.index + match[0].length)];

  return scripts.map(script => {
    const nodes: Node[] = [];
    prepareNodes(script.program as unknown as PreparedNode, null, lineStarts, nodes);
    return { comments: script.comments, nodes };
  });
}

function prepareNodes(node: PreparedNode, parent: PreparedNode | null, lineStarts: number[], nodes: Node[]) {
  node.parent = parent;
  nodes.push(node as unknown as Node);

  if(NODES_WITH_LOC.has(node.type)){
    setLoc(node, lineStarts);
    if(parent && !parent.loc){ setLoc(parent, lineStarts); }
  }

  // Only the properties that hold child nodes are visited. Node types that oxc doesn't know,
  // like the converted Svelte and Vue nodes, fall back to visiting every property.
  const keys = (visitorKeys as Record<string, string[] | undefined>)[node.type];

  if(keys){
    for(const key of keys){ prepareChild(node[key], node, lineStarts, nodes); }
    return;
  }

  for(const key in node){
    if(key !== "parent" && key !== "loc" && key !== "range"){
      prepareChild(node[key], node, lineStarts, nodes);
    }
  }
}

function prepareChild(value: unknown, parent: PreparedNode, lineStarts: number[], nodes: Node[]) {
  if(Array.isArray(value)){
    for(const child of value){ prepareChild(child, parent, lineStarts, nodes); }
    return;
  }

  if(isNode(value)){
    prepareNodes(value, parent, lineStarts, nodes);
  }
}

function isNode(value: unknown): value is PreparedNode {
  return typeof value === "object" && value !== null && typeof (value as PreparedNode).type === "string" && Array.isArray((value as PreparedNode).range);
}

function setLoc(node: PreparedNode, lineStarts: number[]) {
  node.loc = {
    end: getPosition(lineStarts, node.range[1]),
    start: getPosition(lineStarts, node.range[0])
  };
}

function getPosition(lineStarts: number[], offset: number) {
  let low = 0;
  let high = lineStarts.length - 1;

  while(low < high){
    const middle = Math.ceil((low + high) / 2);
    if(lineStarts[middle] <= offset){
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return { column: offset - lineStarts[low], line: low + 1 };
}
