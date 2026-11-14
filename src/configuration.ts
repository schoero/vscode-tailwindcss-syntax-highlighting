import { DEFAULT_SELECTORS } from "./vendor/options/default-options.js";
import { MatcherType, SelectorKind } from "./vendor/types/rule.js";

import type { Selector, Selectors } from "./vendor/types/rule.js";


export interface Settings {
  enabled: boolean;
  /** The selectors that were skipped, with the reason. */
  invalid: string[];
  selectors: Selectors;
}

export function readSettings(configuration: { get: (key: string) => unknown; }): Settings {
  const enabled = configuration.get("enabled");
  return {
    enabled: typeof enabled === "boolean" ? enabled : true,
    ...resolveSelectors(configuration.get("selectors"))
  };
}

// Like the `selectors` option of eslint-plugin-better-tailwindcss, an array replaces the defaults and
// `{ extends: [...] }` adds to them. The defaults are not the setting's default value in package.json,
// because VS Code would copy them into settings.json, where they would no longer receive updates.
// `invalid` lists the selectors that were skipped, with the reason.
export function resolveSelectors(setting: unknown): { invalid: string[]; selectors: Selectors; } {
  if(setting === undefined || setting === null){
    return { invalid: [], selectors: DEFAULT_SELECTORS };
  }

  if(Array.isArray(setting)){
    return validateSelectors(setting, "selectors");
  }

  if(isRecord(setting) && Array.isArray(setting.extends)){
    const { invalid, selectors } = validateSelectors(setting.extends, "selectors.extends");
    return { invalid, selectors: [...DEFAULT_SELECTORS, ...selectors] };
  }

  return {
    invalid: ["selectors: must be an array of selectors or an object with an \"extends\" array"],
    selectors: DEFAULT_SELECTORS
  };
}

function validateSelectors(setting: unknown[], label: string): { invalid: string[]; selectors: Selectors; } {
  const invalid: string[] = [];
  const selectors: Selectors = [];

  for(const [index, selector] of setting.entries()){
    const error = validateSelector(selector);

    if(error){
      invalid.push(`${label}[${index}]: ${error}`);
    } else {
      selectors.push(selector as Selector);
    }
  }

  return { invalid, selectors };
}

// The settings schema already validates the shape in the editor, but settings.json is
// edited by hand, and an invalid regex would otherwise break the highlighting of every file.
function validateSelector(selector: unknown): string | undefined {
  if(!isRecord(selector)){ return "must be an object"; }

  const kinds = Object.values(SelectorKind) as string[];
  if(typeof selector.kind !== "string" || !kinds.includes(selector.kind)){
    return `"kind" must be one of ${kinds.join(", ")}`;
  }

  if(selector.name === undefined && selector.path === undefined){
    return "\"name\" or \"path\" is required";
  }

  for(const key of ["name", "path"] as const){
    const error = validateRegex(selector[key], key);
    if(error){ return error; }
  }

  return validateMatchers(selector.match);
}

function validateMatchers(match: unknown, nested = false): string | undefined {
  if(match === undefined){ return; }
  if(!Array.isArray(match)){ return "\"match\" must be an array"; }

  const types = Object.values(MatcherType) as string[];

  for(const matcher of match){
    if(!isRecord(matcher) || typeof matcher.type !== "string" || !types.includes(matcher.type)){
      return `every matcher needs a "type" of ${types.join(", ")}`;
    }

    if(matcher.type === MatcherType.AnonymousFunctionReturn){
      if(nested){ return `"${MatcherType.AnonymousFunctionReturn}" matchers can't be nested`; }
      if(!Array.isArray(matcher.match)){ return `"${MatcherType.AnonymousFunctionReturn}" matchers need a "match" array`; }

      const error = validateMatchers(matcher.match, true);
      if(error){ return error; }
    }

    const error = validateRegex(matcher.path, "path");
    if(error){ return error; }
  }
}

function validateRegex(pattern: unknown, key: string): string | undefined {
  if(pattern === undefined){ return; }
  if(typeof pattern !== "string"){ return `"${key}" must be a string`; }

  try {
    new RegExp(pattern);
  } catch {
    return `"${key}" is not a valid regular expression: ${pattern}`;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
