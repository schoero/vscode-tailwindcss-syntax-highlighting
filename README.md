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
  [![Version](https://img.shields.io/visual-studio-marketplace/v/schoero.vscode-tailwindcss-syntax-highlighting?style=flat-square&labelColor=454c5c&color=AFD9F8)](https://marketplace.visualstudio.com/items?itemName=schoero.vscode-tailwindcss-syntax-highlighting)
  [![GitHub issues](https://img.shields.io/github/issues/schoero/vscode-tailwindcss-syntax-highlighting?style=flat-square&labelColor=454c5c&color=AFD9F8)](https://github.com/schoero/vscode-tailwindcss-syntax-highlighting/issues)
  [![Installs](https://img.shields.io/visual-studio-marketplace/i/schoero.vscode-tailwindcss-syntax-highlighting?style=flat-square&labelColor=454c5c&color=AFD9F8)](https://marketplace.visualstudio.com/items?itemName=schoero.vscode-tailwindcss-syntax-highlighting)
  [![GitHub repo stars](https://img.shields.io/github/stars/schoero/vscode-tailwindcss-syntax-highlighting?style=flat-square&labelColor=454c5c&color=AFD9F8)](https://github.com/schoero/vscode-tailwindcss-syntax-highlighting/stargazers)
  [![GitHub workflow status](https://img.shields.io/github/actions/workflow/status/schoero/vscode-tailwindcss-syntax-highlighting/ci.yml?event=push&style=flat-square&labelColor=454c5c&color=AFD9F8)](https://github.com/schoero/vscode-tailwindcss-syntax-highlighting/actions?query=workflow%3ACI)

</div>

<br/>
<br/>

<div align="center">
  VSCode extension that adds syntax highlighting for tailwindcss classes in HTML, JSX and TSX files.
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

All colors of the syntax highlighting are customizable via the `.vscode/settings.json` file or via the user `settings.json` file from vscode.
You can always use the `Developer: Inspect Editor Tokens and Scopes` command from the command palette in vscode to find out the scope of a specific token.
For custom styling you should always use the `*.custom.tailwindcss` scope.

```jsonc
{
  "editor.tokenColorCustomizations": {
    "textMateRules": [
      {
        // tailwind classes
        // hover:text-black-500
        // ^^^^^^^^^^^^^^^^^^^^
        "scope": "class.custom.tailwindcss",
        "settings": {
          "foreground": "#AFD9F8"
        }
      },
      {
        // tailwind variant modifier
        // hover:text-black-500/10
        // ^^^^^^
        "scope": "variant.custom.tailwindcss",
        "settings": {
          "foreground": "#B583D3"
        }
      },
      {
        // the property name of a custom property
        // hover:[top:_10px]
        //        ^^^
        "scope": "property-name.custom.tailwindcss",
        "settings": {
          "foreground": "#CA7979"
        }
      },
      {
        // the value of a custom property
        // [top:_10px]
        //      ^^^^^
        "scope": "property-value.custom.tailwindcss",
        "settings": {
          "foreground": "#BABABA"
        }
      },
      {
        // numbers
        // text-red-500 [top:_10px]
        //          ^^^       ^^
        "scope": "number.custom.tailwindcss",
        "settings": {
          "foreground": "#DDDBB4"
        }
      },
      {
        // units
        // [top:_10px]
        //         ^^
        "scope": "unit.custom.tailwindcss",
        "settings": {
          "foreground": "#DDDBB4"
        }
      },
      {
        // square brackets
        // w-[calc(100%_+_4px)]
        //   ^                ^
        "scope": "bracket.custom.tailwindcss",
        "settings": {
          "foreground": "#AFD9F8"
        }
      },
      {
        // css functions in custom properties
        // w-[calc(100%_+_4px)]
        //    ^^^^
        "scope": "function.custom.tailwindcss",
        "settings": {
          "foreground": "#DDDBB4"
        }
      },
      {
        // round brackets
        // w-[calc(100%_+_4px)]
        //        ^          ^
        "scope": "parenthesis.custom.tailwindcss",
        "settings": {
          "foreground": "#AFD9F8"
        }
      },
      {
        // operators
        // w-[calc(100%_+_4px)] text-red-500/10
        //              ^                   ^
        "scope": "operator.custom.tailwindcss",
        "settings": {
          "foreground": "#BABABA"
        }
      },
      {
        // the important prefix
        // !text-red-500
        // ^
        "scope": "important.custom.tailwindcss",
        "settings": {
          "foreground": "#BABABA"
        }
      },
      {
        // css selectors
        // [&>div]:p-4
        //  ^^
        "scope": "selector.custom.tailwindcss",
        "settings": {
          "foreground": "#DDDBB4"
        }
      },
      {
        // tailwindcss whitespace substitute
        // [top:_10px]
        //      ^
        "scope": "whitespace.custom.tailwindcss",
        "settings": {
          "foreground": "#CA797966"
        }
      },
      {
        // quoted strings
        // before:content-['content']
        //                 ^^^^^^^^^
        "scope": "string.custom.tailwindcss",
        "settings": {
          "foreground": "#A6C088"
        }
      },
      {
        // css variables
        // [top:_var(--my-var)]
        //           ^^^^^^^^
        "scope": "variable.custom.tailwindcss",
        "settings": {
          "foreground": "#CA7979"
        }
      },
      {
        // css currentColor
        // [background-color:_currentColor]
        //                    ^^^^^^^^^^^^
        "scope": "current-color.custom.tailwindcss",
        "settings": {
          "foreground": "#80C4B2"
        }
      }
    ]
  }
}
```

<br/>
<br/>

### Want to further improve the readability of your tailwindcss classes?

Check out [eslint-plugin-readable-tailwind](https://github.com/schoero/eslint-plugin-readable-tailwind) to automatically break up long tailwind class strings into multiple lines based on a specified print width or class count.
