import { describe, expect, it } from "vitest";

import { getClassRanges } from "./highlight.js";
import { getContentRanges } from "./literals.js";
import { parseDocument } from "./parsers/document.js";
import { DEFAULT_SELECTORS } from "./vendor/options/default-options.js";
import { MatcherType, SelectorKind } from "./vendor/types/rule.js";

import type { CalleeSelector, Selectors } from "./vendor/types/rule.js";


function getClasses(code: string, languageId = "typescriptreact", selectors: Selectors = DEFAULT_SELECTORS) {
  const ranges = getClassRanges(languageId, code, selectors);
  if(!ranges){ throw new Error("could not parse"); }
  return ranges.map(range => code.slice(range.start, range.end));
}

describe("callees", () => {

  it("should ignore strings in comparisons", () => {
    expect(getClasses("twMerge(someVar === \"comparison\" && \"p-2\")")).toEqual(["p-2"]);
    expect(getClasses("cn(\"comparison\" !== someVar && \"p-2\")")).toEqual(["p-2"]);
  });

  it("should ignore the test of conditional expressions", () => {
    expect(getClasses("cn(variant === \"primary\" ? \"bg-blue-500\" : \"bg-gray-500\")")).toEqual(["bg-blue-500", "bg-gray-500"]);
  });

  it("should ignore strings in nested calls", () => {
    expect(getClasses("cn(list.includes(\"item\") && \"p-2\", \"m-2\")")).toEqual(["p-2", "m-2"]);
  });

  it("should ignore indexed access", () => {
    expect(getClasses("cn(map[\"key\"], \"p-2\")")).toEqual(["p-2"]);
  });

  it("should match object keys but not values", () => {
    expect(getClasses("cn({ \"p-2 m-2\": isActive, key: \"value\" })")).toEqual(["p-2 m-2"]);
  });

  it("should match multiline calls", () => {
    expect(getClasses([
      "clsx(",
      "  \"p-2\",",
      "  isActive",
      "    && \"m-2\"",
      ")"
    ].join("\n"))).toEqual(["p-2", "m-2"]);
  });

  it("should match the parts of template literals", () => {
    expect(getClasses("cn(`p-2 ${isActive ? \"m-2\" : \"\"} flex`)")).toEqual(["p-2 ", "m-2", "", " flex"]);
  });

  it("should match cva base classes and variants but not variant names", () => {
    expect(getClasses("cva(\"base\", { variants: { size: { sm: \"p-2\", lg: \"p-4\" } }, defaultVariants: { size: \"sm\" } })"))
      .toEqual(["base", "p-2", "p-4"]);
  });

  it("should match tv slots", () => {
    expect(getClasses("tv({ slots: { base: \"flex\", icon: \"size-4\" } })")).toEqual(["flex", "size-4"]);
  });

  it("should ignore unknown callees", () => {
    expect(getClasses("foo(\"p-2\")")).toEqual([]);
  });

  it("should compute correct offsets after multi code unit characters", () => {
    const code = "const emoji = \"😀ü\"; cn(\"p-2\")";
    expect(getClasses(code)).toEqual(["p-2"]);
  });

});

describe("variables and tags", () => {

  it("should match class variables", () => {
    expect(getClasses("const classes = isActive ? \"p-2\" : \"m-2\"")).toEqual(["p-2", "m-2"]);
  });

  it("should match tagged templates", () => {
    expect(getClasses("const Button = twc.button`p-2 flex`")).toEqual(["p-2 flex"]);
  });

  it("should match the return values of functions passed to twc components", () => {
    expect(getClasses("const Button = twc.button(props => props.active ? \"p-2\" : \"m-2\")")).toEqual(["p-2", "m-2"]);
    expect(getClasses("const Button = twc.button(function(){ return `p-2 ${size} m-2`; })")).toEqual(["p-2 ", " m-2"]);
  });

});

describe("custom selectors", () => {

  const custom = (code: string, selectors: Selectors) => getClasses(code, "typescriptreact", selectors);

  it("should match export default declarations by the name default", () => {
    const selectors: Selectors = [{ kind: SelectorKind.Variable, match: [{ type: MatcherType.String }], name: "^default$" }];
    expect(custom("export default \"p-2\";", selectors)).toEqual(["p-2"]);
    expect(custom("export default { variant: \"m-2\" };", selectors)).toEqual([]);
  });

  it("should match bare template literals with a comment of the tag name in front", () => {
    const selectors: Selectors = [{ kind: SelectorKind.Tag, name: "^tw$" }];
    expect(custom("const a = /* tw */ `p-2`; const b = `m-2`; const c = /* other */ `flex`;", selectors)).toEqual(["p-2"]);
  });

  it("should match object values", () => {
    const selectors: Selectors = [{ kind: SelectorKind.Callee, match: [{ type: MatcherType.ObjectValue }], name: "^styles$" }];
    expect(custom("styles(\"flex\", { base: \"p-2\", nested: { hover: \"m-2\" } })", selectors)).toEqual(["p-2", "m-2"]);
  });

  it("should only match object values with a matching path", () => {
    const selectors: Selectors = [{ kind: SelectorKind.Callee, match: [{ path: "^variants\\.size\\..*$", type: MatcherType.ObjectValue }], name: "^styles$" }];
    expect(custom("styles({ base: \"flex\", variants: { size: { sm: \"p-2\" }, color: { red: \"m-2\" } } })", selectors)).toEqual(["p-2"]);
  });

  it("should match callees by path", () => {
    const selectors: Selectors = [{ kind: SelectorKind.Callee, match: [{ type: MatcherType.String }], path: "^utils\\.cn$" }];
    expect(custom("utils.cn(\"p-2\"); other.cn(\"m-2\"); cn(\"flex\");", selectors)).toEqual(["p-2"]);
  });

  it("should only match the target call of a call chain", () => {
    const selector: CalleeSelector = { kind: SelectorKind.Callee, match: [{ type: MatcherType.String }], name: "^styles$" };
    const code = "styles(\"p-2\")(\"m-2\")(\"flex\")";

    expect(custom(code, [selector])).toEqual(["p-2"]);
    expect(custom(code, [{ ...selector, targetCall: "last" }])).toEqual(["flex"]);
    expect(custom(code, [{ ...selector, targetCall: 1 }])).toEqual(["m-2"]);
    expect(custom(code, [{ ...selector, targetCall: "all" }])).toEqual(["p-2", "m-2", "flex"]);
  });

  it("should only match the target argument", () => {
    const selector: CalleeSelector = { kind: SelectorKind.Callee, match: [{ type: MatcherType.String }], name: "^styles$" };
    const code = "styles(\"p-2\", \"m-2\", \"flex\")";

    expect(custom(code, [{ ...selector, targetArgument: "first" }])).toEqual(["p-2"]);
    expect(custom(code, [{ ...selector, targetArgument: "last" }])).toEqual(["flex"]);
    expect(custom(code, [{ ...selector, targetArgument: 1 }])).toEqual(["m-2"]);
  });

});

describe("jsx attributes", () => {

  it("should match plain class attributes", () => {
    expect(getClasses("<div className=\"p-2\" />")).toEqual(["p-2"]);
    expect(getClasses("<div className={\"p-2\"} />")).toEqual(["p-2"]);
    expect(getClasses("<div className={`p-2`} />")).toEqual(["p-2"]);
  });

  it("should match expressions in class attributes", () => {
    expect(getClasses("<div className={isActive ? \"p-2\" : \"m-2\"} />")).toEqual(["p-2", "m-2"]);
    expect(getClasses("<div className={cn(\"p-2\", isActive && \"m-2\")} />")).toEqual(["p-2", "m-2"]);
  });

});

describe("languages", () => {

  it("should parse javascript with jsx", () => {
    expect(getClasses("const a = <div className={cn(\"p-2\")} />", "javascript")).toEqual(["p-2"]);
  });

  it("should parse typescript with type assertions", () => {
    expect(getClasses("const a = <string>value; cn(\"p-2\")", "typescript")).toEqual(["p-2"]);
  });

  it("should parse svelte script blocks with correct offsets", () => {
    const code = [
      "<script lang=\"ts\">",
      "  const value: string = cn(\"p-2\", isActive && \"m-2\");",
      "</script>",
      "<div class=\"flex\"></div>",
      "<script context=\"module\">",
      "  export const classes = \"grid\";",
      "</script>"
    ].join("\n");

    expect(getClasses(code, "svelte")).toEqual(["p-2", "m-2", "flex", "grid"]);
  });

  it("should return undefined for code that can't be parsed", () => {
    expect(parseDocument("typescript", "cn(\"p-2\"")).toBeUndefined();
  });

});

describe("svelte markup", () => {

  const svelte = (code: string) => getClasses(code, "svelte");

  it("should match plain class attributes", () => {
    expect(svelte("<div class=\"p-2 m-2\"></div>")).toEqual(["p-2 m-2"]);
    expect(svelte("<div class={\"p-2\"}></div>")).toEqual(["p-2"]);
    expect(svelte("<div class={`p-2`}></div>")).toEqual(["p-2"]);
  });

  it("should match expressions in class attributes", () => {
    expect(svelte("<div class={isActive ? \"p-2\" : \"m-2\"}></div>")).toEqual(["p-2", "m-2"]);
    expect(svelte("<div class=\"flex {isActive ? 'p-2' : 'm-2'} grid\"></div>")).toEqual(["flex ", "p-2", "m-2", " grid"]);
  });

  it("should match callees in markup and ignore comparisons", () => {
    expect(svelte("<Button class={cn(\"p-2\", variant === \"primary\" && \"m-2\")} />")).toEqual(["p-2", "m-2"]);
    expect(svelte("{#if open}<span class={clsx({ \"p-2\": open })}></span>{/if}")).toEqual(["p-2"]);
  });

  it("should match the parts of template literals in markup", () => {
    expect(svelte("<div class={cn(`p-2 ${size} m-2`)}></div>")).toEqual(["p-2 ", " m-2"]);
  });

  it("should match class directives", () => {
    expect(svelte("<div class:p-2={isActive} class:hover:m-2={isHovered}></div>")).toEqual(["p-2", "hover:m-2"]);
  });

  it("should ignore shorthand and spread attributes", () => {
    expect(svelte("<div {...rest} {hidden} class={value}></div>")).toEqual([]);
  });

  it("should parse typescript in markup", () => {
    expect(svelte("<script lang=\"ts\">let x = 1;</script><div class={cn((x as any) && \"p-2\")}></div>")).toEqual(["p-2"]);
  });

  it("should return undefined for markup that can't be parsed", () => {
    expect(parseDocument("svelte", "<div class={cn(\"p-2\"}></div>")).toBeUndefined();
  });

});

describe("vue templates", () => {

  const vue = (template: string, script = "") => getClasses(`${script}<template>${template}</template>`, "vue");

  it("should match static class attributes", () => {
    expect(vue("<div class=\"p-2 m-2\"></div>")).toEqual(["p-2 m-2"]);
  });

  it("should match strings, object keys and arrays in bound classes", () => {
    expect(vue("<div :class=\"'p-2'\"></div>")).toEqual(["p-2"]);
    expect(vue("<div v-bind:class=\"{ 'p-2': active, 'm-2': variant === 'primary' }\"></div>")).toEqual(["p-2", "m-2"]);
    expect(vue("<div :class=\"[isActive ? 'p-2' : 'm-2', 'flex']\"></div>")).toEqual(["p-2", "m-2", "flex"]);
  });

  it("should match callees in bindings, interpolations and handlers", () => {
    expect(vue("<div :class=\"cn('p-2', variant === 'primary' && 'm-2')\"></div>")).toEqual(["p-2", "m-2"]);
    expect(vue("<span>{{ cn(\"p-2\") }}</span>")).toEqual(["p-2"]);
    expect(vue("<button @click=\"toggle(); classes = cn('p-2')\"></button>")).toEqual(["p-2"]);
  });

  it("should match the parts of template literals", () => {
    expect(vue("<div :class=\"`p-2 ${size} m-2`\"></div>")).toEqual(["p-2 ", " m-2"]);
  });

  it("should parse typescript in scripts and templates", () => {
    const script = "<script setup lang=\"ts\">const base: string = cn(\"p-2\");</script>\n";
    expect(vue("<div :class=\"(active as boolean) && 'm-2'\"></div>", script)).toEqual(["p-2", "m-2"]);
  });

  it("should skip v-for and v-slot values", () => {
    expect(vue("<ul><li v-for=\"(item, index) in items\" :key=\"index\" :class=\"cn('p-2')\"></li></ul>")).toEqual(["p-2"]);
  });

  it("should ignore templates in other languages", () => {
    expect(getClasses("<template lang=\"pug\">div(:class=\"cn('p-2')\")</template>", "vue")).toEqual([]);
  });

  it("should not decode html entities", () => {
    expect(vue("<div title=\"a &amp; b\" :class=\"'p-2'\">a &lt; b</div>")).toEqual(["p-2"]);
  });

  it("should return undefined for expressions that can't be parsed", () => {
    expect(parseDocument("vue", "<template><div :class=\"cn('p-2'\"></div></template>")).toBeUndefined();
    expect(parseDocument("vue", "<template><span>{{ cn(\"p-2\" }}</span></template>")).toBeUndefined();
  });

  it("should tolerate unclosed elements", () => {
    expect(vue("<div><span :class=\"cn('p-2')\"></div>")).toEqual(["p-2"]);
  });

});

describe("html", () => {

  const html = (code: string) => getClasses(code, "html");

  it("should match class attributes with any quotes", () => {
    expect(html("<div class=\"p-2 m-2\"><span class='flex'></span><i class=grid></i></div>")).toEqual(["p-2 m-2", "flex", "grid"]);
  });

  it("should match class attributes case-insensitively", () => {
    expect(html("<div CLASS=\"p-2\"></div>")).toEqual(["p-2"]);
  });

  it("should match multiline class attributes", () => {
    expect(html("<div class=\"\n  p-2\n  m-2\n\"></div>")).toEqual(["\n  p-2\n  m-2\n"]);
  });

  it("should ignore other attributes, text and comments", () => {
    expect(html("<!-- <div class=\"p-2\"> --><div id=\"p-2\" data-class=\"m-2\">class=\"flex\"</div>")).toEqual([]);
  });

  it("should match callees in javascript script tags", () => {
    const code = "<div class=\"p-2\"></div>\n<script type=\"module\">el.className = cn(\"m-2\", active && \"flex\");</script>";
    expect(html(code)).toEqual(["p-2", "m-2", "flex"]);
  });

  it("should ignore script tags that aren't javascript", () => {
    expect(html("<script type=\"application/ld+json\">{ \"a\": cn(\"p-2\") }</script><script type=\"text/template\">cn(\"m-2\"</script>")).toEqual([]);
  });

  it("should tolerate unclosed elements", () => {
    expect(html("<div><span class=\"p-2\"></div><p class=\"m-2\">")).toEqual(["p-2", "m-2"]);
  });

  it("should return undefined for scripts that can't be parsed", () => {
    expect(parseDocument("html", "<div class=\"p-2\"></div><script>cn(\"m-2\"</script>")).toBeUndefined();
  });

});

describe("css", () => {

  const css = (code: string, languageId = "css") => getClasses(code, languageId);

  it("should match @apply rules", () => {
    expect(css(".a { @apply flex p-2; } .b { color: red; @apply m-2 }")).toEqual(["flex p-2", "m-2"]);
  });

  it("should match multiline @apply rules", () => {
    expect(css(".a {\n  @apply flex\n    hover:p-2\n    [&>*]:m-2;\n}")).toEqual(["flex\n    hover:p-2\n    [&>*]:m-2"]);
  });

  it("should match @apply rules in tailwind 4 at-rules", () => {
    const code = "@import \"tailwindcss\";\n@theme { --color-brand: red; }\n@custom-variant dark (&:where(.dark, .dark *));\n@utility btn { @apply dark:bg-brand; }";
    expect(css(code)).toEqual(["dark:bg-brand"]);
  });

  it("should ignore comments and other at-rules", () => {
    expect(css("/* @apply p-2; */ .a { @applyx m-2; @media (width > 0) { color: red; } }")).toEqual([]);
  });

  it("should match @apply rules in other stylesheet languages", () => {
    expect(css("$size: 1px; .a { // @apply m-2;\n  &:hover { @apply p-2; } @include mixin; }", "scss")).toEqual(["p-2"]);
    expect(css("@size: 1px; .a { @apply p-2; }", "less")).toEqual(["p-2"]);
    expect(css(".a { @apply p-2; }", "postcss")).toEqual(["p-2"]);
    expect(css(".a { @apply p-2; }", "tailwindcss")).toEqual(["p-2"]);
  });

  it("should tolerate unclosed blocks", () => {
    expect(css(".a { @apply p-2;")).toEqual(["p-2"]);
  });

  it("should match @apply rules in style tags", () => {
    const style = "<style lang=\"postcss\">\n.a { @apply m-2; }\n</style>";
    expect(css(`<div class="p-2"></div>\n${style}`, "html")).toEqual(["p-2", "m-2"]);
    expect(css(`<div class="p-2"></div>\n${style}`, "svelte")).toEqual(["p-2", "m-2"]);
    expect(css(`<template><div class="p-2"></div></template>\n${style}`, "vue")).toEqual(["p-2", "m-2"]);
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
  it.each(Object.entries(fixtures))("should provide every loc the vendored code reads in %s", (languageId, code) => {
    const withRequiredLoc = getContentRanges(code, parseDocument(languageId, code)!, DEFAULT_SELECTORS);

    const scripts = parseDocument(languageId, code)!;
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
