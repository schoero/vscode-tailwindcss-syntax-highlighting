import { readFile, realpath } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import { config, defineConfig } from "@schoero/configs/vite";

import type { Plugin, UserConfig } from "vite";


const require = createRequire(import.meta.url);

const bindingDir = await realpath(dirname(require.resolve("@oxc-parser/binding-wasm32-wasip1/package.json")));

// `@napi-rs/wasm-runtime` only has a peer dependency on emnapi whose range excludes the
// prerelease the oxc binding ships with, so it can resolve to a different copy. Bundling two
// copies throws at load time because the emnapi context and core must come from the same copy.
const dedupeEmnapi: Plugin = {
  enforce: "pre",
  name: "dedupe-emnapi",
  async resolveId(source, _importer, options) {
    if(!/^@emnapi\/(?:core|runtime)$/.test(source)){ return; }
    return this.resolve(source, join(bindingDir, "package.json"), { ...options, skipSelf: true });
  }
};

// The oxc binding loads its wasm file from the directory of the bundle at runtime.
const copyWasm: Plugin = {
  async generateBundle() {
    this.emitFile({
      fileName: "parser.wasm32-wasip1.wasm",
      source: await readFile(require.resolve("@oxc-parser/binding-wasm32-wasip1/wasm")),
      type: "asset"
    });
  },
  name: "copy-wasm"
};

export default defineConfig(({ command, mode }) => (<UserConfig>{
  ...config,
  build: {
    emptyOutDir: true,
    lib: {
      entry: "src/extension.ts",
      fileName: "extension",
      formats: ["es"]
    },
    minify: mode !== "development",
    outDir: "dist",
    rolldownOptions: {
      devtools: { mode: "report" },
      external: ["vscode"],
      output: {
        // Vite keeps whitespace in ES library builds so consumers can still tree-shake them, but
        // nothing bundles the extension after this.
        minify: mode === "development" ? undefined : { codegen: true },
        // The oxc binding is CommonJS and locates its wasm file through `__dirname`.
        postBanner: "const __dirname = import.meta.dirname, __filename = import.meta.filename;"
      }
    },
    sourcemap: mode === "development",
    ssr: true,
    target: "node20"
  },
  plugins: [
    ...config.plugins ?? [],
    dedupeEmnapi,
    copyWasm
  ],
  resolve: {
    ...config.resolve,
    alias: {
      // The ESM build of css-tree loads its JSON data through `createRequire`, which can't be
      // bundled, so the files would be missing from the package. Its CJS build uses plain `require`.
      "@eslint/css-tree": require.resolve("@eslint/css-tree")
    }
  },
  // Tests run against the unbundled sources, where inlining every dependency would load the
  // oxc binding with mismatched emnapi copies.
  ssr: command === "build" ? { noExternal: true } : undefined
}));
