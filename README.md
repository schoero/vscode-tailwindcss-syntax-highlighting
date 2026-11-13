<div align="center">
  <picture>
    <source srcset="./assets/logo.svg">
    <img alt="vscode-tailwindcss-syntax-highlighting logo" src="./assets/logo.png">
  </picture>
</div>

<h1 align="center">Syntax Highlighting for Tailwind CSS</h1>

<br/>
<br/>

<div align="center">

  [![GitHub license](https://img.shields.io/github/license/schoero/vscode-tailwindcss-syntax-highlighting?style=flat-square&labelColor=454c5c&color=AFD9F8)](https://github.com/schoero/vscode-tailwindcss-syntax-highlighting/blob/main/LICENSE)
  [![GitHub issues](https://img.shields.io/github/issues/schoero/vscode-tailwindcss-syntax-highlighting?style=flat-square&labelColor=454c5c&color=AFD9F8)](https://github.com/schoero/vscode-tailwindcss-syntax-highlighting/issues)
  [![GitHub repo stars](https://img.shields.io/github/stars/schoero/vscode-tailwindcss-syntax-highlighting?style=flat-square&labelColor=454c5c&color=AFD9F8)](https://github.com/schoero/vscode-tailwindcss-syntax-highlighting/stargazers)
  [![GitHub workflow status](https://img.shields.io/github/actions/workflow/status/schoero/vscode-tailwindcss-syntax-highlighting/ci.yml?event=push&style=flat-square&labelColor=454c5c&color=AFD9F8)](https://github.com/schoero/vscode-tailwindcss-syntax-highlighting/actions?query=workflow%3ACI)

</div>

<br/>
<br/>

<div align="center">
  VSCode extension that adds syntax highlighting for tailwindcss classes in HTML, JSX, TSX, Svelte, Vue and CSS files.
</div>

<br/>
<br/>

<div align="center">
  <img alt="vscode-tailwindcss-syntax-highlighting example" width="640px" src="./assets/vscode-tailwindcss-syntax-highlighting-example.png">
</div>

<br/>
<br/>

<div align="center">
  <a href="https://github.com/sponsors/schoero">
    <picture>
      <source srcset="./assets/sponsor-dark.svg">
      <img alt="vscode-tailwindcss-syntax-highlighting logo" src="./assets/sponsor-dark.png">
    </picture>
  </a>
</div>

<div align="center">
  This project is financed by the community.  
  If you or your company benefit from this project, please consider becoming a sponsor or making a one-time donation.  
  Your contribution will help me to maintain and develop the project.
</div>

<br/>
<br/>

### Customization

The colors can be customized in the user settings of vscode with `workbench.colorCustomizations`. To open the user settings you can open the command palette with
<kbd>F1</kbd> and search for `Preferences: Open User Settings (JSON)`.

```jsonc
{
  "workbench.colorCustomizations": {
    // tailwind classes
    // hover:text-black-500
    //       ^^^^^^^^^^^
    "tailwindcss.class": "#AFD9F8",
    // tailwind variants
    // hover:text-black-500/10
    // ^^^^^^
    "tailwindcss.variant": "#B583D3",
    // the property name of an arbitrary property
    // hover:[top:_10px]
    //        ^^^
    "tailwindcss.propertyName": "#CA7979",
    // the value of an arbitrary property
    // [top:_10px] bg-[#fff]
    //                 ^^^^
    "tailwindcss.propertyValue": "#BABABA",
    // numbers
    // text-red-500 [top:_10px]
    //          ^^^       ^^
    "tailwindcss.number": "#DDDBB4",
    // units
    // [top:_10px]
    //         ^^
    "tailwindcss.unit": "#DDDBB4",
    // square brackets
    // w-[calc(100%_+_4px)]
    //   ^                ^
    "tailwindcss.bracket": "#AFD9F8",
    // css functions in arbitrary values
    // w-[calc(100%_+_4px)]
    //    ^^^^
    "tailwindcss.function": "#DDDBB4",
    // round brackets
    // w-[calc(100%_+_4px)] bg-(--brand)
    //        ^          ^     ^       ^
    "tailwindcss.parenthesis": "#AFD9F8",
    // operators and negative prefixes
    // w-[calc(100%_+_4px)] text-red-500/10 -mt-2
    //              ^                   ^   ^
    "tailwindcss.operator": "#BABABA",
    // the important modifier
    // !text-red-500 text-red-500!
    // ^                         ^
    "tailwindcss.important": "#BABABA",
    // css selectors in arbitrary variants
    // [&>div]:p-4
    //  ^^^^^
    "tailwindcss.selector": "#DDDBB4",
    // the tailwindcss whitespace substitute
    // [top:_10px]
    //      ^
    "tailwindcss.whitespace": "#CA797966",
    // quoted strings
    // before:content-['content']
    //                 ^^^^^^^^^
    "tailwindcss.string": "#A6C088",
    // css variables
    // [top:_var(--my-var)]
    //           ^^^^^^^^
    "tailwindcss.cssVariable": "#CA7979",
    // css currentColor
    // [background-color:_currentColor]
    //                    ^^^^^^^^^^^^
    "tailwindcss.currentColor": "#80C4B2",
    // commas and the colon of arbitrary properties
    // [top:_10px] [margin:1px,2px]
    //     ^              ^   ^
    "tailwindcss.punctuation": "#BABABA"
  }
}
```

<br/>
<br/>

### Configuration

| Setting | Description |
| --- | --- |
| `tailwindcssSyntaxHighlighting.enabled` | Turns the highlighting on or off. |
| `tailwindcssSyntaxHighlighting.selectors` | Selectors that decide which strings are highlighted. |

The strings are found with the same matchers as in [eslint-plugin-better-tailwindcss](https://github.com/schoero/eslint-plugin-better-tailwindcss). The selectors also use the same format as the plugin's `selectors` option, so you can copy them from your ESLint config.

Setting `tailwindcssSyntaxHighlighting.selectors` replaces the default selectors instead of extending them. Its default value is the full list of default selectors, which VS Code shows when you edit the setting in `settings.json`. Remove the entries you don't need and add your own.

For example, to only highlight `cn()` calls and a custom `myUtility()` function:

```jsonc
{
  "tailwindcssSyntaxHighlighting.selectors": [
    {
      "kind": "callee",
      "name": "^cn$",
      "match": [{ "type": "strings" }, { "type": "objectKeys" }]
    },
    {
      "kind": "callee",
      "name": "^myUtility$",
      "match": [{ "type": "strings" }]
    }
  ]
}
```

#### Selector properties

| Property | Description |
| --- | --- |
| `kind` | Where the selector applies: `attribute` for attributes, `callee` for function calls, `variable` for variable declarations or `tag` for tagged templates. |
| `name` | Regular expression that must match the whole name, for example `^cn$`. |
| `path` | Used instead of `name`. Regular expression that must match the whole path of a callee or tag, for example `^utils\.cn$` or `^styled\.\w+$`. |
| `match` | Matchers that select the strings inside the matched node. Without matchers, only a string passed directly is highlighted. |
| `targetArgument` | Only for `callee`. Which arguments of the call are matched: an index, `first`, `last` or `all` (default). |
| `targetCall` | Only for `callee`. Which call of a curried callee is matched: an index, `first` (default), `last` or `all`. |

#### Matchers

| Matcher | Description |
| --- | --- |
| `{ "type": "strings" }` | Matches all strings that are not matched by another matcher. |
| `{ "type": "objectKeys", "path": "…" }` | Matches object keys. The optional `path` is a regular expression for the object path, for example `^variants.*$`. |
| `{ "type": "objectValues", "path": "…" }` | Matches string object values. The optional `path` works like for `objectKeys`, for example `^compoundVariants\[\d+\]\.class$`. |
| `{ "type": "anonymousFunctionReturn", "match": […] }` | Applies the nested matchers to the return value of anonymous functions. |

HTML attribute values are plain strings, not expressions. In HTML files, attribute selectors therefore only apply when they have no `match`, like the default `class` selector.

<br/>
<br/>

### Want to further improve the readability of your tailwindcss classes?

Check out [eslint-plugin-readable-tailwind](https://github.com/schoero/eslint-plugin-readable-tailwind) to automatically break up long tailwind class strings into multiple lines based on a specified print width or class count.
