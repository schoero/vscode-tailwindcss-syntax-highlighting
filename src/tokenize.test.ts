import { describe, expect, it } from "vitest";

import { tokenize } from "./tokenize.js";


function tokens(content: string) {
  return tokenize(content).map(token => [token.kind, content.slice(token.start, token.end)]);
}

describe("tokenize", () => {

  it("should tokenize plain classes", () => {
    expect(tokens("flex  grid")).toEqual([
      ["class", "flex"],
      ["class", "grid"]
    ]);
  });

  it("should tokenize variants", () => {
    expect(tokens("md:hover:flex")).toEqual([
      ["variant", "md:hover:"],
      ["class", "flex"]
    ]);
  });

  it("should tokenize numbers, negative and important prefixes", () => {
    expect(tokens("-mt-2 !font-bold")).toEqual([
      ["operator", "-"],
      ["class", "mt-"],
      ["number", "2"],
      ["important", "!"],
      ["class", "font-bold"]
    ]);
  });

  it("should tokenize slashes", () => {
    expect(tokens("text-black/50")).toEqual([
      ["class", "text-black"],
      ["operator", "/"],
      ["number", "50"]
    ]);
  });

  it("should tokenize bracketed values with functions and units", () => {
    expect(tokens("w-[calc(100%-1rem)]")).toEqual([
      ["class", "w-"],
      ["bracket", "["],
      ["function", "calc"],
      ["parenthesis", "("],
      ["number", "100"],
      ["unit", "%"],
      ["operator", "-"],
      ["number", "1"],
      ["unit", "rem"],
      ["parenthesis", ")"],
      ["bracket", "]"]
    ]);
  });

  it("should tokenize bracketed properties and css variables", () => {
    expect(tokens("[color:var(--brand)]")).toEqual([
      ["bracket", "["],
      ["propertyName", "color"],
      ["punctuation", ":"],
      ["function", "var"],
      ["parenthesis", "("],
      ["cssVariable", "--brand"],
      ["parenthesis", ")"],
      ["bracket", "]"]
    ]);
  });

  it("should tokenize whitespace substitutes and currentColor", () => {
    expect(tokens("[border:1px_solid_currentColor]")).toEqual([
      ["bracket", "["],
      ["propertyName", "border"],
      ["punctuation", ":"],
      ["number", "1"],
      ["unit", "px"],
      ["whitespace", "_"],
      ["propertyValue", "solid"],
      ["whitespace", "_"],
      ["currentColor", "currentColor"],
      ["bracket", "]"]
    ]);
  });

  it("should tokenize arbitrary variants with selectors", () => {
    expect(tokens("[&>*]:p-2")).toEqual([
      ["bracket", "["],
      ["selector", "&>*"],
      ["bracket", "]"],
      ["variant", ":"],
      ["class", "p-"],
      ["number", "2"]
    ]);
  });

  it("should tokenize named variants with arbitrary values and modifiers", () => {
    expect(tokens("data-[state=open]:group-hover/item:flex")).toEqual([
      ["variant", "data-"],
      ["bracket", "["],
      ["selector", "state"],
      ["operator", "="],
      ["selector", "open"],
      ["bracket", "]"],
      ["variant", ":group-hover"],
      ["operator", "/"],
      ["variant", "item:"],
      ["class", "flex"]
    ]);
  });

  it("should not split on colons inside brackets", () => {
    expect(tokens("[&:hover]:[color:red]")).toEqual([
      ["bracket", "["],
      ["selector", "&:hover"],
      ["bracket", "]"],
      ["variant", ":"],
      ["bracket", "["],
      ["propertyName", "color"],
      ["punctuation", ":"],
      ["propertyValue", "red"],
      ["bracket", "]"]
    ]);
  });

  it("should match nested parentheses", () => {
    expect(tokens("w-[calc(1px)_max(2px,3px)]")).toEqual([
      ["class", "w-"],
      ["bracket", "["],
      ["function", "calc"],
      ["parenthesis", "("],
      ["number", "1"],
      ["unit", "px"],
      ["parenthesis", ")"],
      ["whitespace", "_"],
      ["function", "max"],
      ["parenthesis", "("],
      ["number", "2"],
      ["unit", "px"],
      ["punctuation", ","],
      ["number", "3"],
      ["unit", "px"],
      ["parenthesis", ")"],
      ["bracket", "]"]
    ]);
  });

  it("should tokenize css variable shorthands and type hints", () => {
    expect(tokens("bg-(--brand) bg-[length:200px]")).toEqual([
      ["class", "bg-"],
      ["parenthesis", "("],
      ["cssVariable", "--brand"],
      ["parenthesis", ")"],
      ["class", "bg-"],
      ["bracket", "["],
      ["propertyName", "length"],
      ["punctuation", ":"],
      ["number", "200"],
      ["unit", "px"],
      ["bracket", "]"]
    ]);
  });

  it("should tokenize trailing important modifiers, fractions and decimals", () => {
    expect(tokens("w-1/2 p-0.5 font-bold!")).toEqual([
      ["class", "w-"],
      ["number", "1"],
      ["operator", "/"],
      ["number", "2"],
      ["class", "p-"],
      ["number", "0.5"],
      ["class", "font-bold"],
      ["important", "!"]
    ]);
  });

  it("should only color numbers that form a whole part of the name", () => {
    expect(tokens("h2:text-2xl")).toEqual([
      ["variant", "h2:"],
      ["class", "text-"],
      ["number", "2"],
      ["class", "xl"]
    ]);
  });

  it("should tokenize strings and hex colors", () => {
    expect(tokens("content-['a_b'] bg-[#ff0000]")).toEqual([
      ["class", "content-"],
      ["bracket", "["],
      ["string", "'a_b'"],
      ["bracket", "]"],
      ["class", "bg-"],
      ["bracket", "["],
      ["propertyValue", "#ff0000"],
      ["bracket", "]"]
    ]);
  });

  it("should treat unbalanced brackets as part of the class", () => {
    expect(tokens("w-[10px hover:flex")).toEqual([
      ["class", "w-[10px"],
      ["variant", "hover:"],
      ["class", "flex"]
    ]);
  });

  it("should keep offsets across line breaks", () => {
    const content = "flex\n  md:grid";
    expect(tokenize(content)).toEqual([
      { end: 4, kind: "class", start: 0 },
      { end: 10, kind: "variant", start: 7 },
      { end: 14, kind: "class", start: 10 }
    ]);
  });

});
