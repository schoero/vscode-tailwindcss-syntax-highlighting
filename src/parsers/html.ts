import { NodeTypes, parse } from "es-html-parser";

import type { DocumentNode, ScriptTagNode, StyleTagNode } from "es-html-parser";
import type { Program } from "estree";

import type { ParsedScript } from "./es.js";


export interface Block {
  content: string;
  offset: number;
}

// JSON, templates and other script types would fail to parse as JavaScript.
const JAVASCRIPT_TYPE = /^(?:module|(?:text|application)\/(?:java|ecma)script)$/i;

export function parseHtml(text: string): undefined | { markup: ParsedScript; scripts: Block[]; styles: Block[]; } {
  let ast: DocumentNode;

  try {
    ({ ast } = parse(text));
  } catch {
    return;
  }

  const scripts: Block[] = [];
  const styles: Block[] = [];

  const collectBlocks = (nodes: DocumentNode["children"]) => {
    for(const node of nodes){
      if(isScriptTag(node)){
        if(node.value && isJavaScript(node)){
          scripts.push({ content: node.value.value, offset: node.value.range[0] });
        }
      } else if(isStyleTag(node)){
        if(node.value){
          styles.push({ content: node.value.value, offset: node.value.range[0] });
        }
      } else if("children" in node){
        collectBlocks(node.children);
      }
    }
  };

  collectBlocks(ast.children);

  return {
    markup: { comments: [], program: ast as unknown as Program },
    scripts,
    styles
  };
}

function isScriptTag(node: DocumentNode["children"][number]): node is ScriptTagNode {
  return node.type === NodeTypes.ScriptTag;
}

function isStyleTag(node: DocumentNode["children"][number]): node is StyleTagNode {
  return node.type === NodeTypes.StyleTag;
}

function isJavaScript(script: ScriptTagNode) {
  const type = script.attributes.find(attribute => attribute.key.value.toLowerCase() === "type")?.value?.value.trim();
  return !type || JAVASCRIPT_TYPE.test(type);
}
