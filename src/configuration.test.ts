import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { readSettings, resolveSelectors } from "./configuration.js";
import { getClassRanges } from "./highlight.js";
import { DEFAULT_SELECTORS } from "./vendor/options/default-options.js";


function getClasses(code: string, setting: unknown) {
  const ranges = getClassRanges("typescriptreact", code, resolveSelectors(setting).selectors);
  if(!ranges){ throw new Error("could not parse"); }
  return ranges.map(range => code.slice(range.start, range.end));
}

describe("resolveSelectors", () => {

  it("should use the default selectors without a setting", () => {
    expect(resolveSelectors(undefined)).toEqual({ invalid: [], selectors: DEFAULT_SELECTORS });
  });

  it("should declare the default selectors as the default value of the setting", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    const setting = packageJson.contributes.configuration.properties["tailwindcssSyntaxHighlighting.selectors"];
    expect(setting.default).toEqual(JSON.parse(JSON.stringify(DEFAULT_SELECTORS)));
  });

  it("should replace the default selectors", () => {
    const code = "myUtility(\"p-2\", a === \"b\" && \"m-2\"); cn(\"flex\")";
    const setting = [{ kind: "callee", match: [{ type: "strings" }], name: "^myUtility$" }];
    expect(getClasses(code, setting)).toEqual(["p-2", "m-2"]);
  });

  it("should support selectors with paths and object matchers", () => {
    const code = "styles.create({ base: \"p-2\", ignored: 1, variants: { size: { sm: \"m-2\" } } })";
    const setting = [{ kind: "callee", match: [{ path: "^variants.*$", type: "objectValues" }], path: "^styles\\.create$" }];
    expect(getClasses(code, setting)).toEqual(["m-2"]);
  });

  it("should skip invalid selectors and report them", () => {
    const { invalid, selectors } = resolveSelectors([
      { kind: "callee", name: "^valid$" },
      { kind: "callee", name: "(" },
      { kind: "unknown", name: "^a$" },
      { kind: "callee" },
      { kind: "callee", match: [{ type: "nope" }], name: "^a$" },
      { kind: "callee", match: [{ match: [{ match: [], type: "anonymousFunctionReturn" }], type: "anonymousFunctionReturn" }], name: "^a$" },
      "cn"
    ]);

    expect(selectors).toEqual([{ kind: "callee", name: "^valid$" }]);
    expect(invalid).toHaveLength(6);
    expect(invalid[0]).toMatch(/^selectors\[1]: "name" is not a valid regular expression/);
  });

});

describe("readSettings", () => {

  const configuration = (values: Record<string, unknown>) => ({ get: (key: string) => values[key] });

  it("should default to enabled with the default selectors", () => {
    expect(readSettings(configuration({}))).toEqual({ enabled: true, invalid: [], selectors: DEFAULT_SELECTORS });
  });

  it("should read the enabled flag and the selectors", () => {
    const settings = readSettings(configuration({ enabled: false, selectors: [{ kind: "callee", name: "^a$" }, "b"] }));
    expect(settings.enabled).toBe(false);
    expect(settings.selectors).toEqual([{ kind: "callee", name: "^a$" }]);
    expect(settings.invalid).toHaveLength(1);
  });

});
