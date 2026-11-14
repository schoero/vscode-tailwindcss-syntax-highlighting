import { getContentRanges } from "./literals.js";
import { parseDocument } from "./parsers/document.js";
import { tokenize } from "./tokenize.js";

import type { ContentRange } from "./literals.js";
import type { Token } from "./tokenize.js";
import type { Selectors } from "./vendor/types/rule.js";


// Both functions return `undefined` if the document could not be parsed.

export async function getClassRanges(languageId: string, text: string, selectors: Selectors): Promise<ContentRange[] | undefined> {
  const scripts = await parseDocument(languageId, text);
  return scripts && getContentRanges(text, scripts, selectors);
}

// Tokens of every class string in the document, with offsets into `text`.
export async function highlight(languageId: string, text: string, selectors: Selectors): Promise<Token[] | undefined> {
  const ranges = await getClassRanges(languageId, text, selectors);
  return ranges?.flatMap(range => {
    return tokenize(text.slice(range.start, range.end)).map(token => ({
      end: range.start + token.end,
      kind: token.kind,
      start: range.start + token.start
    }));
  });
}
