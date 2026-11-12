export type TokenKind = typeof TOKEN_KINDS[number];

export interface Token {
  end: number;
  kind: TokenKind;
  start: number;
}

export const TOKEN_KINDS = [
  "bracket",
  "class",
  "cssVariable",
  "currentColor",
  "function",
  "important",
  "number",
  "operator",
  "parenthesis",
  "propertyName",
  "propertyValue",
  "punctuation",
  "selector",
  "string",
  "unit",
  "variant",
  "whitespace"
] as const;

// Arbitrary variants contain selectors, arbitrary values contain css values.
type ArbitraryMode = "selector" | "value";

const CLOSING_BRACKETS = new Map([["(", ")"], ["[", "]"], ["{", "}"]]);

export function tokenize(content: string): Token[] {
  const tokens: Token[] = [];

  const push = (kind: TokenKind, start: number, end: number) => {
    if(start >= end){ return; }
    const last = tokens.at(-1);
    if(last?.kind === kind && last.end === start){
      last.end = end;
    } else {
      tokens.push({ end, kind, start });
    }
  };

  const scanner = createScanner(content, push);

  for(const match of content.matchAll(/\S+/g)){
    scanner.scanClass(match.index, match.index + match[0].length);
  }

  return tokens;
}

function createScanner(text: string, push: (kind: TokenKind, start: number, end: number) => void) {

  const scanClass = (start: number, end: number) => {
    let segmentStart = start;

    for(const colon of findTopLevel(text, start, end, ":")){
      scanVariant(segmentStart, colon);
      push("variant", colon, colon + 1);
      segmentStart = colon + 1;
    }

    scanUtility(segmentStart, end);
  };

  const scanVariant = (start: number, end: number) => {
    if(text[start] === "[" && findClosing(text, start, end) === end - 1){
      scanGroup(start, end - 1, "selector");
      return;
    }

    scanName(start, end, "variant");
  };

  const scanUtility = (start: number, end: number) => {
    // Tailwind CSS 3 places the important modifier at the start, Tailwind CSS 4 at the end.
    if(text[start] === "!"){
      push("important", start, start + 1);
      start++;
    }

    const important = end > start && text[end - 1] === "!";
    if(important){ end--; }

    if(text[start] === "-" && isLetter(text[start + 1])){
      push("operator", start, start + 1);
      start++;
    }

    if(text[start] === "[" && findClosing(text, start, end) === end - 1){
      scanGroup(start, end - 1, "value");
    } else {
      scanName(start, end, "class");
    }

    if(important){ push("important", end, end + 1); }
  };

  // Scans the named part of a variant or utility, for example `data-[state=open]` or `bg-red-500/50`.
  const scanName = (start: number, end: number, kind: "class" | "variant") => {
    let index = start;

    while(index < end){
      const char = text[index];

      if(char === "[" || char === "("){
        const close = findClosing(text, index, end);
        if(close !== -1){
          scanGroup(index, close, kind === "variant" ? "selector" : "value");
          index = close + 1;
          continue;
        }
      }

      if(char === "/"){
        push("operator", index, index + 1);
        index++;
        continue;
      }

      // Only numbers that form a whole part of the name, so the `2` in `mt-2` but not in `h2:`.
      if(kind === "class" && isDigit(char) && (index === start || text[index - 1] === "-" || text[index - 1] === "/")){
        const numberEnd = readNumber(text, index, end);
        push("number", index, numberEnd);
        index = numberEnd;
        if(text[index] === "%" && index < end){
          push("unit", index, index + 1);
          index++;
        }
        continue;
      }

      push(kind, index, index + 1);
      index++;
    }
  };

  const scanGroup = (open: number, close: number, mode: ArbitraryMode) => {
    const kind = text[open] === "[" ? "bracket" : "parenthesis";

    push(kind, open, open + 1);
    scanArbitrary(open + 1, close, mode);
    push(kind, close, close + 1);
  };

  const scanArbitrary = (start: number, end: number, mode: ArbitraryMode) => {
    let index = start;

    // A leading name followed by a colon is a property in `[color:red]` or a type hint in `bg-[length:2px]`.
    if(mode === "value"){
      const nameEnd = readIdentifier(text, start, end);
      if(nameEnd > start && nameEnd < end && text[nameEnd] === ":"){
        push(text.startsWith("--", start) ? "cssVariable" : "propertyName", start, nameEnd);
        push("punctuation", nameEnd, nameEnd + 1);
        index = nameEnd + 1;
      }
    }

    scanArbitraryValue(index, end, mode);
  };

  const scanArbitraryValue = (start: number, end: number, mode: ArbitraryMode) => {
    const base = mode === "selector" ? "selector" : "propertyValue";
    let index = start;

    while(index < end){
      const char = text[index];
      const next = text[index + 1];

      if(char === "\\"){
        push(base, index, Math.min(index + 2, end));
        index += 2;
        continue;
      }

      if(char === "_"){
        push("whitespace", index, index + 1);
        index++;
        continue;
      }

      if(char === "\"" || char === "'"){
        const stringEnd = readString(text, index, end);
        push("string", index, stringEnd);
        index = stringEnd;
        continue;
      }

      if(char === "[" || char === "("){
        const close = findClosing(text, index, end);
        if(close !== -1){
          const kind = char === "[" ? "bracket" : "parenthesis";
          push(kind, index, index + 1);
          scanArbitraryValue(index + 1, close, mode);
          push(kind, close, close + 1);
          index = close + 1;
          continue;
        }
      }

      if(char === "-" && next === "-" && (index === start || !isIdentifierChar(text[index - 1]))){
        const variableEnd = readIdentifier(text, index, end);
        push("cssVariable", index, variableEnd);
        index = variableEnd;
        continue;
      }

      if(isLetter(char) || char === "-" && isLetter(next)){
        const identifierEnd = readIdentifier(text, index, end);
        const identifier = text.slice(index, identifierEnd);

        if(text[identifierEnd] === "(" && identifierEnd < end){
          push("function", index, identifierEnd);
        } else if(identifier.toLowerCase() === "currentcolor"){
          push("currentColor", index, identifierEnd);
        } else {
          push(base, index, identifierEnd);
        }

        index = identifierEnd;
        continue;
      }

      if(isDigit(char) || char === "." && isDigit(next)){
        const numberEnd = readNumber(text, index, end);
        push("number", index, numberEnd);
        index = numberEnd;

        let unitEnd = index;
        while(unitEnd < end && (isLetter(text[unitEnd]) || text[unitEnd] === "%")){ unitEnd++; }
        push("unit", index, unitEnd);
        index = unitEnd;
        continue;
      }

      // Hex colors like `#ff0000` would otherwise be split into numbers and units.
      if(char === "#" && mode === "value"){
        const colorEnd = readIdentifier(text, index + 1, end);
        push(base, index, colorEnd);
        index = colorEnd;
        continue;
      }

      if(char === ","){
        push("punctuation", index, index + 1);
        index++;
        continue;
      }

      if(mode === "selector" && "&>~+*".includes(char)){
        push("selector", index, index + 1);
        index++;
        continue;
      }

      if("+-*/=".includes(char)){
        push("operator", index, index + 1);
        index++;
        continue;
      }

      push(base, index, index + 1);
      index++;
    }
  };

  return { scanClass };
}

// Finds the indices of `separator` outside of brackets, parentheses, braces and strings.
// Adapted from `segment` in Tailwind CSS: https://github.com/tailwindlabs/tailwindcss/blob/b08bf83a327271dfb7e3cd485fd793da15013f7c/packages/tailwindcss/src/utils/segment.ts
function findTopLevel(text: string, start: number, end: number, separator: string): number[] {
  const indices: number[] = [];
  const stack: string[] = [];

  for(let index = start; index < end; index++){
    const char = text[index];

    if(stack.length === 0 && char === separator){
      indices.push(index);
      continue;
    }

    index = skip(text, index, end, stack);
  }

  return indices;
}

// Returns the index of the bracket that closes the one at `open`, or -1 if it isn't closed before `end`.
function findClosing(text: string, open: number, end: number): number {
  const stack: string[] = [];

  for(let index = open; index < end; index++){
    index = skip(text, index, end, stack);
    if(stack.length === 0){ return index; }
  }

  return -1;
}

// Updates the bracket stack for the character at `index` and returns the index of the last character it consumed.
function skip(text: string, index: number, end: number, stack: string[]): number {
  const char = text[index];

  if(char === "\\"){ return index + 1; }

  // An apostrophe outside of brackets is more likely a typo than the start of a string.
  if((char === "\"" || char === "'") && stack.length > 0){
    return readString(text, index, end) - 1;
  }

  const closing = CLOSING_BRACKETS.get(char);

  if(closing){
    stack.push(closing);
  } else if(stack.length > 0 && char === stack.at(-1)){
    stack.pop();
  }

  return index;
}

// Returns the index after the closing quote of the string at `start`, or `end` if it isn't closed.
function readString(text: string, start: number, end: number): number {
  const quote = text[start];

  for(let index = start + 1; index < end; index++){
    if(text[index] === "\\"){
      index++;
      continue;
    }
    if(text[index] === quote){ return index + 1; }
  }

  return end;
}

function readIdentifier(text: string, start: number, end: number): number {
  let index = start;
  while(index < end && isIdentifierChar(text[index])){ index++; }
  return index;
}

function readNumber(text: string, start: number, end: number): number {
  let index = start;
  while(index < end && isDigit(text[index])){ index++; }
  if(text[index] === "." && index + 1 < end && isDigit(text[index + 1])){
    index++;
    while(index < end && isDigit(text[index])){ index++; }
  }
  return index;
}

function isDigit(char: string | undefined): boolean {
  return char !== undefined && char >= "0" && char <= "9";
}

function isLetter(char: string | undefined): boolean {
  return char !== undefined && (char >= "a" && char <= "z" || char >= "A" && char <= "Z");
}

function isIdentifierChar(char: string | undefined): boolean {
  return isLetter(char) || isDigit(char) || char === "-";
}
