import { describe, expect, it } from "vitest";

import { highlight } from "./highlight.js";
import { DEFAULT_SELECTORS } from "./vendor/options/default-options.js";


function tokens(languageId: string, code: string) {
  return highlight(languageId, code, DEFAULT_SELECTORS)?.map(token => [token.kind, code.slice(token.start, token.end)]);
}

describe("highlight", () => {

  it("should return tokens with offsets into the document", () => {
    expect(tokens("typescriptreact", "const a = <div className=\"md:flex\" />;")).toEqual([
      ["variant", "md:"],
      ["class", "flex"]
    ]);
  });

  it("should combine scripts and markup of single file components", () => {
    expect(tokens("vue", "<script setup>const a = cn(\"p-2\");</script>\n<template><div class=\"grid\"></div></template>")).toEqual([
      ["class", "p-"],
      ["number", "2"],
      ["class", "grid"]
    ]);
  });

  it("should return undefined if the document can't be parsed", () => {
    expect(highlight("typescript", "cn(\"p-2\"", DEFAULT_SELECTORS)).toBeUndefined();
  });

  it("should return no tokens for unsupported languages", () => {
    expect(highlight("python", "cn(\"p-2\")", DEFAULT_SELECTORS)).toEqual([]);
  });

});
