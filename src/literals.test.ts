import { describe, expect, it } from "vitest";

import { getClassRanges } from "./highlight.js";
import { getContentRanges } from "./literals.js";
import { parseDocument } from "./parsers/document.js";
import { DEFAULT_SELECTORS } from "./vendor/options/default-options.js";
import { MatcherType, SelectorKind } from "./vendor/types/rule.js";

import type { CalleeSelector, Selectors } from "./vendor/types/rule.js";


async function getClasses(code: string, languageId = "typescriptreact", selectors: Selectors = DEFAULT_SELECTORS) {
  const ranges = await getClassRanges(languageId, code, selectors);
  if(!ranges){ throw new Error("could not parse"); }
  return ranges.map(range => code.slice(range.start, range.end));
}

describe("callees", () => {

  it("should ignore strings in comparisons", async () => {
    expect(await getClasses("twMerge(someVar === \"comparison\" && \"p-2\")")).toEqual(["p-2"]);
    expect(await getClasses("cn(\"comparison\" !== someVar && \"p-2\")")).toEqual(["p-2"]);
  });

  it("should ignore the test of conditional expressions", async () => {
    expect(await getClasses("cn(variant === \"primary\" ? \"bg-blue-500\" : \"bg-gray-500\")")).toEqual(["bg-blue-500", "bg-gray-500"]);
  });

  it("should ignore strings in nested calls", async () => {
    expect(await getClasses("cn(list.includes(\"item\") && \"p-2\", \"m-2\")")).toEqual(["p-2", "m-2"]);
  });

  it("should ignore indexed access", async () => {
    expect(await getClasses("cn(map[\"key\"], \"p-2\")")).toEqual(["p-2"]);
  });

  it("should match object keys but not values", async () => {
    expect(await getClasses("cn({ \"p-2 m-2\": isActive, key: \"value\" })")).toEqual(["p-2 m-2"]);
  });

  it("should match multiline calls", async () => {
    expect(await getClasses([
      "clsx(",
      "  \"p-2\",",
      "  isActive",
      "    && \"m-2\"",
      ")"
    ].join("\n"))).toEqual(["p-2", "m-2"]);
  });

  it("should match the parts of template literals", async () => {
    expect(await getClasses("cn(`p-2 ${isActive ? \"m-2\" : \"\"} flex`)")).toEqual(["p-2 ", "m-2", "", " flex"]);
  });

  it("should match cva base classes and variants but not variant names", async () => {
    expect(await getClasses("cva(\"base\", { variants: { size: { sm: \"p-2\", lg: \"p-4\" } }, defaultVariants: { size: \"sm\" } })"))
      .toEqual(["base", "p-2", "p-4"]);
  });

  it("should match tv slots", async () => {
    expect(await getClasses("tv({ slots: { base: \"flex\", icon: \"size-4\" } })")).toEqual(["flex", "size-4"]);
  });

  it("should ignore unknown callees", async () => {
    expect(await getClasses("foo(\"p-2\")")).toEqual([]);
  });

  it("should compute correct offsets after multi code unit characters", async () => {
    const code = "const emoji = \"😀ü\"; cn(\"p-2\")";
    expect(await getClasses(code)).toEqual(["p-2"]);
  });

});

describe("variables and tags", () => {

  it("should match class variables", async () => {
    expect(await getClasses("const classes = isActive ? \"p-2\" : \"m-2\"")).toEqual(["p-2", "m-2"]);
  });

  it("should match tagged templates", async () => {
    expect(await getClasses("const Button = twc.button`p-2 flex`")).toEqual(["p-2 flex"]);
  });

  it("should match the return values of functions passed to twc components", async () => {
    expect(await getClasses("const Button = twc.button(props => props.active ? \"p-2\" : \"m-2\")")).toEqual(["p-2", "m-2"]);
    expect(await getClasses("const Button = twc.button(function(){ return `p-2 ${size} m-2`; })")).toEqual(["p-2 ", " m-2"]);
  });

});

describe("custom selectors", () => {

  const custom = async (code: string, selectors: Selectors) => getClasses(code, "typescriptreact", selectors);

  it("should match export default declarations by the name default", async () => {
    const selectors: Selectors = [{ kind: SelectorKind.Variable, match: [{ type: MatcherType.String }], name: "^default$" }];
    expect(await custom("export default \"p-2\";", selectors)).toEqual(["p-2"]);
    expect(await custom("export default { variant: \"m-2\" };", selectors)).toEqual([]);
  });

  it("should match bare template literals with a comment of the tag name in front", async () => {
    const selectors: Selectors = [{ kind: SelectorKind.Tag, name: "^tw$" }];
    expect(await custom("const a = /* tw */ `p-2`; const b = `m-2`; const c = /* other */ `flex`;", selectors)).toEqual(["p-2"]);
  });

  it("should match object values", async () => {
    const selectors: Selectors = [{ kind: SelectorKind.Callee, match: [{ type: MatcherType.ObjectValue }], name: "^styles$" }];
    expect(await custom("styles(\"flex\", { base: \"p-2\", nested: { hover: \"m-2\" } })", selectors)).toEqual(["p-2", "m-2"]);
  });

  it("should only match object values with a matching path", async () => {
    const selectors: Selectors = [{ kind: SelectorKind.Callee, match: [{ path: "^variants\\.size\\..*$", type: MatcherType.ObjectValue }], name: "^styles$" }];
    expect(await custom("styles({ base: \"flex\", variants: { size: { sm: \"p-2\" }, color: { red: \"m-2\" } } })", selectors)).toEqual(["p-2"]);
  });

  it("should match callees by path", async () => {
    const selectors: Selectors = [{ kind: SelectorKind.Callee, match: [{ type: MatcherType.String }], path: "^utils\\.cn$" }];
    expect(await custom("utils.cn(\"p-2\"); other.cn(\"m-2\"); cn(\"flex\");", selectors)).toEqual(["p-2"]);
  });

  it("should only match the target call of a call chain", async () => {
    const selector: CalleeSelector = { kind: SelectorKind.Callee, match: [{ type: MatcherType.String }], name: "^styles$" };
    const code = "styles(\"p-2\")(\"m-2\")(\"flex\")";

    expect(await custom(code, [selector])).toEqual(["p-2"]);
    expect(await custom(code, [{ ...selector, targetCall: "last" }])).toEqual(["flex"]);
    expect(await custom(code, [{ ...selector, targetCall: 1 }])).toEqual(["m-2"]);
    expect(await custom(code, [{ ...selector, targetCall: "all" }])).toEqual(["p-2", "m-2", "flex"]);
  });

  it("should only match the target argument", async () => {
    const selector: CalleeSelector = { kind: SelectorKind.Callee, match: [{ type: MatcherType.String }], name: "^styles$" };
    const code = "styles(\"p-2\", \"m-2\", \"flex\")";

    expect(await custom(code, [{ ...selector, targetArgument: "first" }])).toEqual(["p-2"]);
    expect(await custom(code, [{ ...selector, targetArgument: "last" }])).toEqual(["flex"]);
    expect(await custom(code, [{ ...selector, targetArgument: 1 }])).toEqual(["m-2"]);
  });

});

describe("jsx attributes", () => {

  it("should match plain class attributes", async () => {
    expect(await getClasses("<div className=\"p-2\" />")).toEqual(["p-2"]);
    expect(await getClasses("<div className={\"p-2\"} />")).toEqual(["p-2"]);
    expect(await getClasses("<div className={`p-2`} />")).toEqual(["p-2"]);
  });

  it("should match expressions in class attributes", async () => {
    expect(await getClasses("<div className={isActive ? \"p-2\" : \"m-2\"} />")).toEqual(["p-2", "m-2"]);
    expect(await getClasses("<div className={cn(\"p-2\", isActive && \"m-2\")} />")).toEqual(["p-2", "m-2"]);
  });

});

describe("languages", () => {

  it("should parse javascript with jsx", async () => {
    expect(await getClasses("const a = <div className={cn(\"p-2\")} />", "javascript")).toEqual(["p-2"]);
  });

  it("should parse typescript with type assertions", async () => {
    expect(await getClasses("const a = <string>value; cn(\"p-2\")", "typescript")).toEqual(["p-2"]);
  });

  it("should parse svelte script blocks with correct offsets", async () => {
    const code = [
      "<script lang=\"ts\">",
      "  const value: string = cn(\"p-2\", isActive && \"m-2\");",
      "</script>",
      "<div class=\"flex\"></div>",
      "<script context=\"module\">",
      "  export const classes = \"grid\";",
      "</script>"
    ].join("\n");

    expect(await getClasses(code, "svelte")).toEqual(["p-2", "m-2", "flex", "grid"]);
  });

  it("should return undefined for code that can't be parsed", async () => {
    expect(await parseDocument("typescript", "cn(\"p-2\"")).toBeUndefined();
  });

});

describe("svelte markup", () => {

  const svelte = async (code: string) => getClasses(code, "svelte");

  it("should match plain class attributes", async () => {
    expect(await svelte("<div class=\"p-2 m-2\"></div>")).toEqual(["p-2 m-2"]);
    expect(await svelte("<div class={\"p-2\"}></div>")).toEqual(["p-2"]);
    expect(await svelte("<div class={`p-2`}></div>")).toEqual(["p-2"]);
  });

  it("should match expressions in class attributes", async () => {
    expect(await svelte("<div class={isActive ? \"p-2\" : \"m-2\"}></div>")).toEqual(["p-2", "m-2"]);
    expect(await svelte("<div class=\"flex {isActive ? 'p-2' : 'm-2'} grid\"></div>")).toEqual(["flex ", "p-2", "m-2", " grid"]);
  });

  it("should match callees in markup and ignore comparisons", async () => {
    expect(await svelte("<Button class={cn(\"p-2\", variant === \"primary\" && \"m-2\")} />")).toEqual(["p-2", "m-2"]);
    expect(await svelte("{#if open}<span class={clsx({ \"p-2\": open })}></span>{/if}")).toEqual(["p-2"]);
  });

  it("should match the parts of template literals in markup", async () => {
    expect(await svelte("<div class={cn(`p-2 ${size} m-2`)}></div>")).toEqual(["p-2 ", " m-2"]);
  });

  it("should match class directives", async () => {
    expect(await svelte("<div class:p-2={isActive} class:hover:m-2={isHovered}></div>")).toEqual(["p-2", "hover:m-2"]);
  });

  it("should ignore shorthand and spread attributes", async () => {
    expect(await svelte("<div {...rest} {hidden} class={value}></div>")).toEqual([]);
  });

  it("should parse typescript in markup", async () => {
    expect(await svelte("<script lang=\"ts\">let x = 1;</script><div class={cn((x as any) && \"p-2\")}></div>")).toEqual(["p-2"]);
  });

  it("should return undefined for markup that can't be parsed", async () => {
    expect(await parseDocument("svelte", "<div class={cn(\"p-2\"}></div>")).toBeUndefined();
  });

});

describe("vue templates", () => {

  const vue = async (template: string, script = "") => getClasses(`${script}<template>${template}</template>`, "vue");

  it("should match static class attributes", async () => {
    expect(await vue("<div class=\"p-2 m-2\"></div>")).toEqual(["p-2 m-2"]);
  });

  it("should match strings, object keys and arrays in bound classes", async () => {
    expect(await vue("<div :class=\"'p-2'\"></div>")).toEqual(["p-2"]);
    expect(await vue("<div v-bind:class=\"{ 'p-2': active, 'm-2': variant === 'primary' }\"></div>")).toEqual(["p-2", "m-2"]);
    expect(await vue("<div :class=\"[isActive ? 'p-2' : 'm-2', 'flex']\"></div>")).toEqual(["p-2", "m-2", "flex"]);
  });

  it("should match callees in bindings, interpolations and handlers", async () => {
    expect(await vue("<div :class=\"cn('p-2', variant === 'primary' && 'm-2')\"></div>")).toEqual(["p-2", "m-2"]);
    expect(await vue("<span>{{ cn(\"p-2\") }}</span>")).toEqual(["p-2"]);
    expect(await vue("<button @click=\"toggle(); classes = cn('p-2')\"></button>")).toEqual(["p-2"]);
  });

  it("should match the parts of template literals", async () => {
    expect(await vue("<div :class=\"`p-2 ${size} m-2`\"></div>")).toEqual(["p-2 ", " m-2"]);
  });

  it("should parse typescript in scripts and templates", async () => {
    const script = "<script setup lang=\"ts\">const base: string = cn(\"p-2\");</script>\n";
    expect(await vue("<div :class=\"(active as boolean) && 'm-2'\"></div>", script)).toEqual(["p-2", "m-2"]);
  });

  it("should skip v-for and v-slot values", async () => {
    expect(await vue("<ul><li v-for=\"(item, index) in items\" :key=\"index\" :class=\"cn('p-2')\"></li></ul>")).toEqual(["p-2"]);
  });

  it("should ignore templates in other languages", async () => {
    expect(await getClasses("<template lang=\"pug\">div(:class=\"cn('p-2')\")</template>", "vue")).toEqual([]);
  });

  it("should not decode html entities", async () => {
    expect(await vue("<div title=\"a &amp; b\" :class=\"'p-2'\">a &lt; b</div>")).toEqual(["p-2"]);
  });

  it("should return undefined for expressions that can't be parsed", async () => {
    expect(await parseDocument("vue", "<template><div :class=\"cn('p-2'\"></div></template>")).toBeUndefined();
    expect(await parseDocument("vue", "<template><span>{{ cn(\"p-2\" }}</span></template>")).toBeUndefined();
  });

  it("should tolerate unclosed elements", async () => {
    expect(await vue("<div><span :class=\"cn('p-2')\"></div>")).toEqual(["p-2"]);
  });

});

describe("html", () => {

  const html = async (code: string) => getClasses(code, "html");

  it("should match class attributes with any quotes", async () => {
    expect(await html("<div class=\"p-2 m-2\"><span class='flex'></span><i class=grid></i></div>")).toEqual(["p-2 m-2", "flex", "grid"]);
  });

  it("should match class attributes case-insensitively", async () => {
    expect(await html("<div CLASS=\"p-2\"></div>")).toEqual(["p-2"]);
  });

  it("should match multiline class attributes", async () => {
    expect(await html("<div class=\"\n  p-2\n  m-2\n\"></div>")).toEqual(["\n  p-2\n  m-2\n"]);
  });

  it("should ignore other attributes, text and comments", async () => {
    expect(await html("<!-- <div class=\"p-2\"> --><div id=\"p-2\" data-class=\"m-2\">class=\"flex\"</div>")).toEqual([]);
  });

  it("should match callees in javascript script tags", async () => {
    const code = "<div class=\"p-2\"></div>\n<script type=\"module\">el.className = cn(\"m-2\", active && \"flex\");</script>";
    expect(await html(code)).toEqual(["p-2", "m-2", "flex"]);
  });

  it("should ignore script tags that aren't javascript", async () => {
    expect(await html("<script type=\"application/ld+json\">{ \"a\": cn(\"p-2\") }</script><script type=\"text/template\">cn(\"m-2\"</script>")).toEqual([]);
  });

  it("should tolerate unclosed elements", async () => {
    expect(await html("<div><span class=\"p-2\"></div><p class=\"m-2\">")).toEqual(["p-2", "m-2"]);
  });

  it("should return undefined for scripts that can't be parsed", async () => {
    expect(await parseDocument("html", "<div class=\"p-2\"></div><script>cn(\"m-2\"</script>")).toBeUndefined();
  });

});

describe("css", () => {

  const css = async (code: string, languageId = "css") => getClasses(code, languageId);

  it("should match @apply rules", async () => {
    expect(await css(".a { @apply flex p-2; } .b { color: red; @apply m-2 }")).toEqual(["flex p-2", "m-2"]);
  });

  it("should match multiline @apply rules", async () => {
    expect(await css(".a {\n  @apply flex\n    hover:p-2\n    [&>*]:m-2;\n}")).toEqual(["flex\n    hover:p-2\n    [&>*]:m-2"]);
  });

  it("should match @apply rules in tailwind 4 at-rules", async () => {
    const code = "@import \"tailwindcss\";\n@theme { --color-brand: red; }\n@custom-variant dark (&:where(.dark, .dark *));\n@utility btn { @apply dark:bg-brand; }";
    expect(await css(code)).toEqual(["dark:bg-brand"]);
  });

  it("should ignore comments and other at-rules", async () => {
    expect(await css("/* @apply p-2; */ .a { @applyx m-2; @media (width > 0) { color: red; } }")).toEqual([]);
  });

  it("should match @apply rules in other stylesheet languages", async () => {
    expect(await css("$size: 1px; .a { // @apply m-2;\n  &:hover { @apply p-2; } @include mixin; }", "scss")).toEqual(["p-2"]);
    expect(await css("@size: 1px; .a { @apply p-2; }", "less")).toEqual(["p-2"]);
    expect(await css(".a { @apply p-2; }", "postcss")).toEqual(["p-2"]);
    expect(await css(".a { @apply p-2; }", "tailwindcss")).toEqual(["p-2"]);
  });

  it("should tolerate unclosed blocks", async () => {
    expect(await css(".a { @apply p-2;")).toEqual(["p-2"]);
  });

  it("should match @apply rules in style tags", async () => {
    const style = "<style lang=\"postcss\">\n.a { @apply m-2; }\n</style>";
    expect(await css(`<div class="p-2"></div>\n${style}`, "html")).toEqual(["p-2", "m-2"]);
    expect(await css(`<div class="p-2"></div>\n${style}`, "svelte")).toEqual(["p-2", "m-2"]);
    expect(await css(`<template><div class="p-2"></div></template>\n${style}`, "vue")).toEqual(["p-2", "m-2"]);
  });

});

describe("loc", () => {

  const fixtures = {
    html: [
      "<!doctype html>",
      "<div class=\"flex p-2\">",
      "  <span class='m-2'></span>",
      "  <p",
      "    class=\"grid\"",
      "  ></p>",
      "</div>",
      "<script>",
      "  const classes = cn(\"p-2\", `m-2 ${size}`, active && \"flex\");",
      "</script>"
    ].join("\n"),
    svelte: [
      "<script lang=\"ts\">",
      "  const classes = cn(\"p-2\", `m-2 ${size} flex`, variant === \"a\" && \"grid\");",
      "</script>",
      "<div class=\"flex {active ? 'p-2' : 'm-2'}\" class:hover:p-2={active}>",
      "  <span class={clsx({ \"p-2\": active }, `m-2 ${size}`)}></span>",
      "</div>"
    ].join("\n"),
    typescriptreact: [
      "const styles = \"p-2\" + \" m-2\";",
      "const button = cva(\"flex\", { variants: { size: { sm: \"p-2\" } } });",
      "const Box = twc.div`p-2 ${size} m-2`;",
      "export default function App({ active }) {",
      "  return <div className={cn(\"p-2\", `m-2 ${size} flex`, { \"grid\": active })} class={active ? \"a\" : \"b\"} />;",
      "}"
    ].join("\n"),
    vue: [
      "<script setup lang=\"ts\">const classes = cn(\"p-2\", `m-2 ${size}`);</script>",
      "<template>",
      "  <div class=\"flex p-2\" :class=\"[active ? 'p-2' : 'm-2', `grid ${size}`, { 'm-2': active }]\">{{ cn('p-2') }}</div>",
      "</template>"
    ].join("\n")
  };

  // The vendored code skips literals whose node or parent has no `loc`. If a sync of the vendored code reads
  // `loc` of more node types than `prepareNodes` provides, setting `loc` on every node finds more literals.
  it.each(Object.entries(fixtures))("should provide every loc the vendored code reads in %s", async (languageId, code) => {
    const withRequiredLoc = getContentRanges(code, (await parseDocument(languageId, code))!, DEFAULT_SELECTORS);

    const scripts = (await parseDocument(languageId, code))!;
    for(const script of scripts){ setLocOnEveryNode(script.nodes[0]); }
    const withEveryLoc = getContentRanges(code, scripts, DEFAULT_SELECTORS);

    expect(withRequiredLoc.length).toBeGreaterThan(5);
    expect(withRequiredLoc).toEqual(withEveryLoc);
  });

  function setLocOnEveryNode(node: unknown) {
    if(!node || typeof node !== "object"){ return; }
    if(Array.isArray(node)){ node.forEach(setLocOnEveryNode); return; }

    const record = node as Record<string, unknown>;
    if(typeof record.type === "string" && Array.isArray(record.range)){
      record.loc ??= { end: { column: 0, line: 1 }, start: { column: 0, line: 1 } };
    }

    for(const [key, value] of Object.entries(record)){
      if(key !== "parent" && key !== "loc"){ setLocOnEveryNode(value); }
    }
  }

});
