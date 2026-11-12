# Vendored code

The files in this directory are copied from [eslint-plugin-better-tailwindcss](https://github.com/schoero/eslint-plugin-better-tailwindcss) at commit [`2cb17e51432b3b1bcd55332c7e48d8795f5f5273`](https://github.com/schoero/eslint-plugin-better-tailwindcss/tree/2cb17e51432b3b1bcd55332c7e48d8795f5f5273/src).

| Here | Upstream |
| --- | --- |
| `parsers/css.ts`, `parsers/es.ts`, `parsers/html.ts`, `parsers/jsx.ts`, `parsers/svelte.ts`, `parsers/vue.ts` | `src/parsers/` |
| `utils/matchers.ts`, `utils/utils.ts`, `utils/visitedNodes.ts` | `src/utils/` |
| `utils/regex.ts` | `src/async-utils/regex.ts` |
| `types/ast.ts`, `types/rule.ts`, `types/estree.ts` | `src/types/` |
| `options/default-options.ts`, `options/callees/*`, `options/tags/*` | `src/options/` |

Changes made while copying:

- The `better-tailwindcss:` import alias is replaced by relative imports.
- `import type { Rule } from "eslint"` is replaced by the local stand-in in `types/eslint.ts`.
- `parsers/css.ts` uses the AST of [@eslint/css-tree](https://github.com/eslint/csstree) with the [tailwind-csstree](https://github.com/eslint/tailwind-csstree) syntax, which is the AST @eslint/css produces. `src/parsers/css.ts` parses the stylesheets.
- `parsers/html.ts` uses the AST of [es-html-parser](https://github.com/yeonjuan/es-html-parser) directly, which is the AST @html-eslint/parser produces. `src/parsers/html.ts` parses the document.
- The svelte-eslint-parser AST types in `parsers/svelte.ts` are replaced by the local stand-in in `types/svelte.ts`. `src/svelte.ts` converts the AST of the Svelte compiler into that shape.
- The vue-eslint-parser AST types in `parsers/vue.ts` are replaced by the local stand-in in `types/vue.ts`. `src/vue.ts` converts the AST of the Vue compiler into that shape.
- Lint-only code is removed:
  - from `types/rule.ts`, every type after `SelectorByKind`
  - from `utils/utils.ts`, `display`, `augmentMessageWithWarnings` and `escapeMessage`
  - from `utils/matchers.ts`, the legacy option-tuple type guards (`isCalleeName` and the others)
  - from `options/default-options.ts`, `DEFAULT_VARIABLE_NAMES`
- Imports are reordered by `eslint --fix` of this repository.

Not yet committed upstream: literals no longer carry `priorLiterals` and the concatenation meta as properties. They provide `getPriorLiterals()` and `getConcatenation()` instead, which compute the values on the first call (`types/ast.ts`, `once` in `utils/utils.ts`, `getRelatedLiterals` in `parsers/es.ts`, `parsers/css.ts`). Once it is committed, update the commit above and remove this note.

To sync with a newer upstream version, diff upstream between the commit above and the new one, apply the relevant changes here, and update the commit hash.
