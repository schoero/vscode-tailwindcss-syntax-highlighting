import { parseSync } from "oxc-parser/src-js/wasm.js";

import type { Program } from "estree";


export type Lang = "js" | "jsx" | "ts" | "tsx";

export interface Comment {
  end: number;
  start: number;
  type: "Block" | "Line";
  value: string;
}

/** An AST whose ranges are offsets into the whole document. */
export interface ParsedScript {
  comments: Comment[];
  program: Program;
}

export function parseScript(lang: Lang, source: string, offset: number): ParsedScript | undefined {
  const result = parse(lang, source, offset);

  // oxc returns an empty program when it can't recover from a syntax error
  if(result.errors.length > 0 && result.program.body.length === 0 && source.trim() !== ""){
    return;
  }

  return { comments: result.comments, program: result.program };
}

// Unlike whole scripts, Vue template expressions must parse completely,
// because a partial result would silently drop the rest of the expression.

export function parseExpression(lang: Lang, source: string, offset: number): Program | undefined {
  const result = parse(lang, `(${source})`, offset - 1);
  return result.errors.length === 0 ? result.program : undefined;
}

export function parseStatements(lang: Lang, source: string, offset: number): Program | undefined {
  const result = parse(lang, source, offset);
  return result.errors.length === 0 ? result.program : undefined;
}

function parse(lang: Lang, source: string, offset: number) {
  const result = parseSync(`source.${lang}`, source, {
    astType: "ts",
    lang,
    preserveParens: false,
    range: true
  });

  const program = result.program as unknown as Program;
  const comments: Comment[] = result.comments.map(({ end, start, type, value }) => ({
    end: end + offset,
    start: start + offset,
    type,
    value
  }));

  if(offset !== 0){
    shiftRanges(program, offset);
  }

  return { comments, errors: result.errors, program };
}

function shiftRanges(node: unknown, offset: number) {
  if(!node || typeof node !== "object"){ return; }

  if(Array.isArray(node)){
    for(const child of node){ shiftRanges(child, offset); }
    return;
  }

  const record = node as Record<string, unknown>;

  if(Array.isArray(record.range)){
    record.range = [record.range[0] + offset, record.range[1] + offset];
  }

  for(const [key, value] of Object.entries(record)){
    if(key !== "range"){ shiftRanges(value, offset); }
  }
}
