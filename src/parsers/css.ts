import { fork, toPlainObject, walk } from "@eslint/css-tree";
import { tailwind4 } from "tailwind-csstree";

import type { CssNode } from "@eslint/css-tree";
import type { Program } from "estree";

import type { ParsedScript } from "./es.js";


let syntax: ReturnType<typeof fork> | undefined;

// css-tree recovers from every syntax error, so unlike the other parsers this one never fails.
export function parseCss(source: string, offset: number): ParsedScript {
  // Same syntax as the CSS language of eslint-plugin-better-tailwindcss is configured with.
  syntax ??= fork(tailwind4);

  const ast = syntax.parse(source, { positions: true });

  walk(ast, (node: CssNode & { range?: [number, number]; }) => {
    if(node.loc){
      node.range = [node.loc.start.offset + offset, node.loc.end.offset + offset];
    }
  });

  return { comments: [], program: toPlainObject(ast) as unknown as Program };
}
