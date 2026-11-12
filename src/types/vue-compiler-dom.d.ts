// The browser build is used because the default build bundles Babel, which is only needed for compiling templates.
declare module "@vue/compiler-dom/dist/compiler-dom.esm-browser.prod.js" {
  export * from "@vue/compiler-dom";
}
