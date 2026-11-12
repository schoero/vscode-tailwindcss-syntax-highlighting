import { parseCss } from "./css.js";
import { parseScript } from "./es.js";
import { parseHtml } from "./html.js";
import { prepareScripts } from "./prepare.js";
import { parseSvelteMarkup } from "./svelte.js";
import { parseVueTemplate } from "./vue.js";

import type { Lang, ParsedScript } from "./es.js";
import type { PreparedScript } from "./prepare.js";


const LANGS: Record<string, Lang> = {
  javascript: "jsx",
  javascriptreact: "jsx",
  typescript: "ts",
  typescriptreact: "tsx"
};

// `tailwindcss` is the language mode of the official Tailwind CSS extension.
const CSS_LANGUAGE_IDS = ["css", "less", "postcss", "scss", "tailwindcss"];

export const SUPPORTED_LANGUAGE_IDS = [...Object.keys(LANGS), ...CSS_LANGUAGE_IDS, "html", "svelte", "vue"];

// Returns `undefined` if anything could not be parsed,
// so callers can keep showing the previous result while the user is in the middle of typing.
export function parseDocument(languageId: string, text: string): PreparedScript[] | undefined {
  const parsed = parseParts(languageId, text);
  if(!parsed?.every(script => script !== undefined)){ return; }

  return prepareScripts(text, parsed);
}

function parseParts(languageId: string, text: string): (ParsedScript | undefined)[] | undefined {
  if(languageId in LANGS){
    return [parseScript(LANGS[languageId], text, 0)];
  }

  if(CSS_LANGUAGE_IDS.includes(languageId)){
    return [parseCss(text, 0)];
  }

  if(languageId === "html"){
    const html = parseHtml(text);
    return html && [
      ...html.scripts.map(script => parseScript("js", script.content, script.offset)),
      ...html.styles.map(style => parseCss(style.content, style.offset)),
      html.markup
    ];
  }

  if(languageId !== "svelte" && languageId !== "vue"){
    return [];
  }

  const blocks = getScriptBlocks(text);
  const scripts = blocks.map(block => parseScript(block.lang, block.content, block.offset));
  const styles = getStyleBlocks(text).map(block => parseCss(block.content, block.offset));

  const markup = languageId === "svelte"
    ? parseSvelteMarkup(text)
    : parseVueTemplate(text, blocks.some(block => block.lang === "ts" || block.lang === "tsx") ? "ts" : "js");

  return [...scripts, ...styles, markup];
}

function getScriptBlocks(text: string) {
  return [...text.matchAll(/<script\b([^>]*)>([\S\s]*?)<\/script\s*>/g)].map(match => {
    const [whole, attributes, content] = match;
    const lang = /\blang\s*=\s*["']?(ts|tsx|jsx|typescript)\b/.exec(attributes)?.[1];

    return {
      content,
      lang: (lang === "typescript" ? "ts" : lang ?? "js") as Lang,
      offset: match.index + whole.indexOf(">") + 1
    };
  });
}

function getStyleBlocks(text: string) {
  return [...text.matchAll(/<style\b[^>]*>([\S\s]*?)<\/style\s*>/g)].map(match => {
    const [whole, content] = match;
    return { content, offset: match.index + whole.indexOf(">") + 1 };
  });
}
