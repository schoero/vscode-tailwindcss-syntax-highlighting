import { getCachedRegex } from "./regex.js";

import type { BracesMeta, Concatenation, Indentation, Literal, QuoteMeta } from "../types/ast.js";


export function getWhitespace(classes: string) {
  const leadingWhitespace = classes.match(/^\s*/)?.[0];
  const trailingWhitespace = classes.match(/\s*$/)?.[0];

  return { leadingWhitespace, trailingWhitespace };
}

export function getQuotes(raw: string): QuoteMeta {
  const openingQuote = raw.at(0);
  const closingQuote = raw.at(-1);

  return {
    closingQuote: closingQuote === "'" || closingQuote === '"' || closingQuote === "`" ? closingQuote : undefined,
    openingQuote: openingQuote === "'" || openingQuote === '"' || openingQuote === "`" ? openingQuote : undefined
  };
}

export function getContent(raw: string, quotes?: QuoteMeta, braces?: BracesMeta) {
  return raw.substring(
    (quotes?.openingQuote?.length ?? 0) + (braces?.closingBraces?.length ?? 0),
    raw.length - (quotes?.closingQuote?.length ?? 0) - (braces?.openingBraces?.length ?? 0)
  );
}

export function splitClasses(classes: string): string[] {
  if(classes.trim() === ""){
    return [];
  }

  return classes
    .trim()
    .split(/\s+/);
}

export function deduplicateClasses(classes: string[]): string[] {
  return classes.filter((className, index) => {
    return classes.indexOf(className) === index;
  });
}

export function splitWhitespaces(classes: string): string[] {
  return classes.split(/\S+/);
}

export function getIndentation(line: string): Indentation["indentation"] {
  const leadingWhitespace = line.match(/^[\t ]*/)?.[0] ?? "";

  return {
    spaces: leadingWhitespace.match(/ /g)?.length ?? 0,
    tabs: leadingWhitespace.match(/\t/g)?.length ?? 0
  };
}

export function isClassSticky(literal: Literal, classIndex: number): boolean {
  const classes = literal.content;

  const classChunks = splitClasses(classes);
  const whitespaceChunks = splitWhitespaces(classes);

  const startsWithWhitespace = whitespaceChunks.length > 0 && whitespaceChunks[0] !== "";
  const endsWithWhitespace = whitespaceChunks.length > 0 && whitespaceChunks[whitespaceChunks.length - 1] !== "";

  return (
    !startsWithWhitespace && classIndex === 0 && !!literal.closingBraces ||
    !endsWithWhitespace && classIndex === classChunks.length - 1 && !!literal.openingBraces
  );
}

export function isConcatenatedLeft(literal: Literal): boolean {
  const concatenation = literal.getConcatenation();

  if(!concatenation.isConcatenatedLeft && !literal.closingBraces){
    return false;
  }

  if(literal.leadingWhitespace?.length){
    return false;
  }

  if(concatenation.hasDynamicLeftNeighbor){
    return true;
  }

  if(concatenation.leftLiterals.length === 0){
    return true;
  }

  return concatenation.leftLiterals.some(leftLiteral => {
    if(!leftLiteral.content.length){
      return isConcatenatedLeft(leftLiteral);
    }

    if(leftLiteral.trailingWhitespace?.length){
      return false;
    }

    return true;
  });
}

export function isConcatenatedRight(literal: Literal): boolean {
  const concatenation = literal.getConcatenation();

  if(!concatenation.isConcatenatedRight && !literal.openingBraces){
    return false;
  }

  if(literal.trailingWhitespace?.length){
    return false;
  }

  if(concatenation.hasDynamicRightNeighbor){
    return true;
  }

  if(concatenation.rightLiterals.length === 0){
    return true;
  }

  return concatenation.rightLiterals.some(rightLiteral => {
    if(!rightLiteral.content.length){
      return isConcatenatedRight(rightLiteral);
    }

    if(rightLiteral.leadingWhitespace?.length){
      return false;
    }

    return true;
  });
}

export function isConcatenatedLiteral(literal: Literal) {
  const isTemplateInterpolation =
    literal.isInterpolated === true &&
    (
      literal.openingBraces !== undefined ||
      literal.closingBraces !== undefined
    );

  if(isTemplateInterpolation){
    return true;
  }

  const concatenation = literal.getConcatenation();

  return concatenation.isConcatenatedLeft || concatenation.isConcatenatedRight;
}

export function getExactClassLocation(literal: Literal, startIndex: number, endIndex: number) {
  const linesUpToStartIndex = literal.content.slice(0, startIndex).split(/\r?\n/);
  const isOnFirstLine = linesUpToStartIndex.length === 1;
  const containingLine = linesUpToStartIndex.at(-1);

  const line = literal.loc.start.line + linesUpToStartIndex.length - 1;
  const column = (
    isOnFirstLine
      ? literal.loc.start.column + (literal.openingQuote?.length ?? 0) + (literal.closingBraces?.length ?? 0)
      : 0
  ) + (containingLine?.length ?? 0);

  return {
    end: {
      column: column + (endIndex - startIndex),
      line
    },
    start: {
      column,
      line
    }
  };
}

export function matchesName(pattern: string, name: string | undefined): boolean {
  if(!name){ return false; }

  const match = getCachedRegex(pattern).exec(name);
  return !!match && match[0] === name;
}

export function replacePlaceholders(template: string, match: RegExpMatchArray | string[]): string {
  return template.replace(getCachedRegex(/\$(\d+)/g), (_, groupIndex) => {
    const index = Number(groupIndex);
    return match[index] ?? "";
  });
}

export function addAttribute(name: string | undefined): (literal: Literal, index: number, literals: Literal[]) => Literal {
  return (literal: Literal) => {
    if(!name){
      return literal;
    }

    literal.attribute = name;
    return literal;
  };
}

export function deduplicateLiterals(literal: Literal, index: number, literals: Literal[]): boolean {
  return literals.findIndex(l2 => {
    return literal.content === l2.content &&
      literal.range[0] === l2.range[0] &&
      literal.range[1] === l2.range[1];
  }) === index;
}

export function createObjectPathElement(path?: string): string {
  if(!path){ return ""; }

  return getCachedRegex(/^[A-Z_a-z]\w*$/).test(path)
    ? path
    : `["${path}"]`;
}

export interface GenericNodeWithParent {
  parent: Partial<GenericNodeWithParent>;
}

export function isGenericNodeWithParent(node: unknown): node is GenericNodeWithParent {
  return (
    typeof node === "object" &&
    node !== null &&
    "parent" in node &&
    node.parent !== null &&
    typeof node.parent === "object"
  );
}

/**
 * Wraps a function so that it is only called once and its result is reused afterwards.
 *
 * @template Value The type of the result.
 * @param fn The function to wrap.
 * @returns A function that returns the result of the first call.
 */
export function once<Value>(fn: () => Value): () => Value {
  let called = false;
  let value: Value;

  return () => {
    if(!called){
      value = fn();
      called = true;
    }
    return value;
  };
}

const NO_CONCATENATION: Concatenation = {
  hasDynamicLeftNeighbor: false,
  hasDynamicRightNeighbor: false,
  isConcatenatedLeft: false,
  isConcatenatedRight: false,
  leftLiterals: [],
  rightLiterals: []
};

/**
 * For literals that can't be concatenated with other literals.
 *
 * @returns A concatenation without neighbors.
 */
export function getNoConcatenation(): Concatenation {
  return NO_CONCATENATION;
}

/**
 * For literals that have no other literals before them.
 *
 * @returns An empty list of literals.
 */
export function getNoPriorLiterals(): Literal[] {
  return [];
}
