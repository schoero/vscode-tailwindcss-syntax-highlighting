// Importing the keys from the main module would load the oxc WASM runtime with them.
declare module "oxc-parser/src-js/generated/visit/keys.js" {
  const visitorKeys: Record<string, string[]>;
  export default visitorKeys;
}
