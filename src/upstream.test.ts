import { describe, expect, it } from "vitest";

import { getClassRanges } from "./highlight.js";
import { CN_OBJECT_KEYS, CN_STRINGS } from "./vendor/options/callees/cn.js";
import { CVA_COMPOUND_VARIANTS_CLASS, CVA_VARIANT_VALUES } from "./vendor/options/callees/cva.js";
import {
  TV_BASE_VALUES,
  TV_COMPOUND_SLOTS_CLASS,
  TV_COMPOUND_VARIANTS_CLASS,
  TV_SLOTS_VALUES,
  TV_STRINGS,
  TV_VARIANT_VALUES
} from "./vendor/options/callees/tv.js";

import type { Selector } from "./vendor/types/rule.js";


// Fixtures from the callee tests of eslint-plugin-better-tailwindcss (src/options/callees/*.test.ts).
// They make sure the vendored matchers behave the same on oxc's AST as on the AST inside ESLint:
// every string marked " lint " must be matched, and nothing else.
const fixtures: [name: string, selector: Selector, code: string][] = [
  ["cn strings", CN_STRINGS, "cn(\" lint \", [\" lint \", \" lint \"])"],
  ["cn object keys", CN_OBJECT_KEYS, "cn(\" ignore \", { \" lint \": { \" lint \": \" ignore \" } })"],
  ["cva variant values", CVA_VARIANT_VALUES, "cva(\" ignore \", { variants: { \" ignore \": \" lint \" }, compoundVariants: { \" ignore \": \" ignore \" } })"],
  ["cva compound variants", CVA_COMPOUND_VARIANTS_CLASS, "cva(\" ignore \", { variants: { \" ignore \": \" ignore \" }, compoundVariants: [{ \" ignore \": \" ignore \", \"class\": \" lint \", \"className\": \" lint \" }] })"],
  ["tv strings", TV_STRINGS, "tv(\" lint \", [\" lint \", \" lint \"])"],
  ["tv variant values", TV_VARIANT_VALUES, "tv(\" ignore \", { variants: { \" ignore \": \" lint \" }, compoundVariants: { \" ignore \": \" ignore \" } })"],
  ["tv compound variants", TV_COMPOUND_VARIANTS_CLASS, "tv(\" ignore \", { variants: { \" ignore \": \" ignore \" }, compoundVariants: [{ \" ignore \": \" ignore \", \"class\": \" lint \", \"className\": \" lint \" }] })"],
  ["tv compound variant arrays", TV_COMPOUND_VARIANTS_CLASS, "tv(\" ignore \", { slots: { \" ignore \": \" ignore \" }, compoundVariants: [{ \" ignore \": \" ignore \", \"class\": [\" lint \", \" lint \"], \"className\": [\" lint \", \" lint \", \" lint \"] }] })"],
  ["tv base", TV_BASE_VALUES, "tv(\" ignore \", { base: \" lint \", variants: { \" ignore \": \" ignore \" }, compoundVariants: { \" ignore \": \" ignore \" } })"],
  ["tv slots", TV_SLOTS_VALUES, "tv(\" ignore \", { slots: { slotName: \" lint \", anotherSlot: [\" lint \", \" lint \"] }, variants: { \" ignore \": \" ignore \" } })"],
  ["tv compound slots", TV_COMPOUND_SLOTS_CLASS, "tv(\" ignore \", { slots: { \" ignore \": \" ignore \" }, compoundSlots: [{ slots: [\" ignore \", \" ignore \"], \" ignore \": \" ignore \", \"class\": \" lint \", \"className\": \" lint \" }] })"]
];

describe("upstream callee fixtures", () => {

  it.each(fixtures)("%s", (_, selector, code) => {
    for(const [languageId, source] of [["typescriptreact", code], ["svelte", `<script>${code}</script>`], ["html", `<script>${code}</script>`]] as const){
      const ranges = getClassRanges(languageId, source, [selector]);
      if(!ranges){ throw new Error("could not parse"); }

      const matched = ranges.map(range => source.slice(range.start, range.end));
      const expected = code.match(/ lint /g)?.length ?? 0;

      expect(matched).toHaveLength(expected);
      expect(matched.every(content => content === " lint ")).toBe(true);
    }
  });

});
