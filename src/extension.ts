import * as vscode from "vscode";

import { readSettings } from "./configuration.js";
import { highlight } from "./highlight.js";
import { SUPPORTED_LANGUAGE_IDS } from "./parsers/document.js";
import { TOKEN_KINDS } from "./tokenize.js";

import type { Settings } from "./configuration.js";
import type { Token, TokenKind } from "./tokenize.js";


const CONFIGURATION_SECTION = "tailwindcssSyntaxHighlighting";
const UPDATE_DELAY = 100;

type TokenRanges = Record<TokenKind, vscode.Range[]>;

export function activate(context: vscode.ExtensionContext) {
  const decorationTypes = TOKEN_KINDS.map(kind => [kind, vscode.window.createTextEditorDecorationType({
    color: new vscode.ThemeColor(`tailwindcss.${kind}`),
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
  })] as const);

  const cache = new Map<vscode.TextDocument, { tokens: TokenRanges; version: number; }>();
  const timers = new Map<vscode.TextDocument, NodeJS.Timeout>();

  let settings: Settings;

  const readConfiguration = () => {
    settings = readSettings(vscode.workspace.getConfiguration(CONFIGURATION_SECTION));
    cache.clear();

    if(settings.invalid.length > 0){
      void vscode.window.showWarningMessage(
        `Tailwind CSS Syntax Highlighting: some selectors are ignored. ${settings.invalid.join("; ")}`
      );
    }
  };

  const getTokens = (document: vscode.TextDocument): TokenRanges | undefined => {
    const cached = cache.get(document);
    if(cached?.version === document.version){ return cached.tokens; }

    const highlighted = highlight(document.languageId, document.getText(), settings.selectors);
    if(!highlighted){ return; }

    const tokens = toRanges(document, highlighted);
    cache.set(document, { tokens, version: document.version });
    return tokens;
  };

  const decorate = (editor: vscode.TextEditor) => {
    if(!SUPPORTED_LANGUAGE_IDS.includes(editor.document.languageId)){ return; }

    let tokens: TokenRanges | undefined;

    try {
      tokens = settings.enabled ? getTokens(editor.document) : undefined;
    } catch (error){
      console.error("[tailwindcss-syntax-highlighting]", error);
    }

    // Syntax errors are common while typing. The previous decorations stay in place and move
    // with the edits, which looks better than clearing them until the code parses again.
    if(settings.enabled && !tokens){ return; }

    for(const [kind, decorationType] of decorationTypes){
      editor.setDecorations(decorationType, tokens?.[kind] ?? []);
    }
  };

  const decorateVisibleEditors = (document?: vscode.TextDocument) => {
    for(const editor of vscode.window.visibleTextEditors){
      if(!document || editor.document === document){ decorate(editor); }
    }
  };

  readConfiguration();
  decorateVisibleEditors();

  context.subscriptions.push(
    ...decorationTypes.map(([, decorationType]) => decorationType),
    vscode.window.onDidChangeVisibleTextEditors(editors => editors.forEach(decorate)),
    vscode.workspace.onDidChangeTextDocument(({ contentChanges, document }) => {
      if(contentChanges.length === 0){ return; }
      clearTimeout(timers.get(document));
      timers.set(document, setTimeout(() => {
        timers.delete(document);
        decorateVisibleEditors(document);
      }, UPDATE_DELAY));
    }),
    vscode.workspace.onDidCloseTextDocument(document => {
      cache.delete(document);
      clearTimeout(timers.get(document));
      timers.delete(document);
    }),
    vscode.workspace.onDidChangeConfiguration(event => {
      if(!event.affectsConfiguration(CONFIGURATION_SECTION)){ return; }
      readConfiguration();
      decorateVisibleEditors();
    }),
    { dispose: () => timers.forEach(clearTimeout) }
  );
}

function toRanges(document: vscode.TextDocument, tokens: Token[]): TokenRanges {
  const ranges = Object.fromEntries(TOKEN_KINDS.map(kind => [kind, []])) as unknown as TokenRanges;

  for(const token of tokens){
    ranges[token.kind].push(new vscode.Range(document.positionAt(token.start), document.positionAt(token.end)));
  }

  return ranges;
}
