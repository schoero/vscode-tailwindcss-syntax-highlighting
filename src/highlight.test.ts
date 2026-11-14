import { describe, expect, it } from "vitest";

import { highlight } from "./highlight.js";
import { DEFAULT_SELECTORS } from "./vendor/options/default-options.js";


async function tokens(languageId: string, code: string) {
  const highlighted = await highlight(languageId, code, DEFAULT_SELECTORS);
  return highlighted?.map(token => [token.kind, code.slice(token.start, token.end)]);
}

describe("highlight", () => {

  it("should return tokens with offsets into the document", async () => {
    expect(await tokens("typescriptreact", "const a = <div className=\"md:flex\" />;")).toEqual([
      ["variant", "md:"],
      ["class", "flex"]
    ]);
  });

  it("should combine scripts and markup of single file components", async () => {
    expect(await tokens("vue", "<script setup>const a = cn(\"p-2\");</script>\n<template><div class=\"grid\"></div></template>")).toEqual([
      ["class", "p-"],
      ["number", "2"],
      ["class", "grid"]
    ]);
  });

  it("should return undefined if the document can't be parsed", async () => {
    expect(await highlight("typescript", "cn(\"p-2\"", DEFAULT_SELECTORS)).toBeUndefined();
  });

  it("should return no tokens for unsupported languages", async () => {
    expect(await highlight("python", "cn(\"p-2\")", DEFAULT_SELECTORS)).toEqual([]);
  });

});
