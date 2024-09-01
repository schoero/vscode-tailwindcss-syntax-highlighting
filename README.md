<div align="center">
  <picture>
    <source srcset="./assets/logo.svg">
    <img alt="vscode-tailwindcss-syntax-highlighting logo" src="./assets/logo.png">
  </picture>
</div>

<h1 align="center">vscode-tailwindcss-syntax-highlighting</h1>

<br/>
<br/>

<div align="center">

  [![GitHub license](https://img.shields.io/github/license/schoero/vscode-tailwindcss-syntax-highlighting?style=flat-square&labelColor=454c5c&color=B78DBA)](https://github.com/schoero/vscode-tailwindcss-syntax-highlighting/blob/main/LICENSE)
  [![Version](https://img.shields.io/visual-studio-marketplace/v/schoero.vscode-tailwindcss-syntax-highlighting?style=flat-square&labelColor=454c5c&color=BC88AD)](https://marketplace.visualstudio.com/items?itemName=schoero.vscode-tailwindcss-syntax-highlighting)
  [![GitHub issues](https://img.shields.io/github/issues/schoero/vscode-tailwindcss-syntax-highlighting?style=flat-square&labelColor=454c5c&color=C1829F)](https://github.com/schoero/vscode-tailwindcss-syntax-highlighting/issues)
  [![Downloads](https://img.shields.io/visual-studio-marketplace/d/schoero.vscode-tailwindcss-syntax-highlighting?style=flat-square&labelColor=454c5c&color=C77D92)](https://marketplace.visualstudio.com/items?itemName=schoero.vscode-tailwindcss-syntax-highlighting)
  [![GitHub repo stars](https://img.shields.io/github/stars/schoero/vscode-tailwindcss-syntax-highlighting?style=flat-square&labelColor=454c5c&color=CC7784)](https://github.com/schoero/vscode-tailwindcss-syntax-highlighting/stargazers)
  [![GitHub workflow status](https://img.shields.io/github/actions/workflow/status/schoero/vscode-tailwindcss-syntax-highlighting/ci.yml?event=push&style=flat-square&labelColor=454c5c&color=D17277)](https://github.com/schoero/vscode-tailwindcss-syntax-highlighting/actions?query=workflow%3ACI)

</div>

<br/>
<br/>

<div align="center">
VSCode extension that adds syntax highlighting for tailwindcss classes in JavaScript, TypeScript, JSX files.
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

You can customize the colors of the syntax highlighting in your settings.json file.

```jsonc
{
  "editor.tokenColorCustomizations": {
    "textMateRules": [
      {
        // tailwind variant modifier eg. hover: or before:
        "scope": "variant.tailwindcss",
        "settings": {
          "foreground": "#B583D3"
        }
      },
      {
        // tailwind classes eg. flex or rounded
        "scope": "class.tailwindcss",
        "settings": {
          "foreground": "#CA7979"
        }
      },
      {
        // the property name of a custom property eg. [top:_10px]
        "scope": "property-name.tailwindcss",
        "settings": {
          "foreground": "#CA7979"
        }
      },
      {
        // the value of a custom property eg. [top:_10px]
        "scope": "property-value.tailwindcss",
        "settings": {
          "foreground": "#BABABA"
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
