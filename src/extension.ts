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

  const cache = new Map<vscode.TextDocument, { tokens: Promise<TokenRanges | undefined>; version: number; }>();
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

  const getTokens = (document: vscode.TextDocument) => {
    const cached = cache.get(document);
    if(cached?.version === document.version){ return cached; }

    const parsedVersion = document.version;

    const tokens = (async () => {
      try {
        const highlighted = await highlight(document.languageId, document.getText(), settings.selectors);
        // The offsets only fit the text they were computed from.
        if(highlighted && document.version === parsedVersion){ return toRanges(document, highlighted); }
      } catch (error){
        console.error("[tailwindcss-syntax-highlighting]", error);
      }
    })();

    const entry = { tokens, version: parsedVersion };
    cache.set(document, entry);
    return entry;
  };

  const decorate = async (editor: vscode.TextEditor) => {
    const { document } = editor;
    if(!SUPPORTED_LANGUAGE_IDS.includes(document.languageId)){ return; }

    let tokens: TokenRanges | undefined;

    if(settings.enabled){
      const entry = getTokens(document);
      tokens = await entry.tokens;

      // While a parser was loading, the document may have been edited or closed, or the settings
      // reloaded. A newer call takes care of those, and this result would be wrong.
      if(cache.get(document) !== entry || document.version !== entry.version){ return; }

      // Syntax errors are common while typing. The previous decorations stay in place and move
      // with the edits, which looks better than clearing them until the code parses again.
      if(!tokens){ return; }
    }

    for(const [kind, decorationType] of decorationTypes){
      editor.setDecorations(decorationType, tokens?.[kind] ?? []);
    }
  };

  const decorateVisibleEditors = (document?: vscode.TextDocument) => {
    for(const editor of vscode.window.visibleTextEditors){
      if(!document || editor.document === document){ void decorate(editor); }
    }
  };

  readConfiguration();
  decorateVisibleEditors();

  context.subscriptions.push(
    ...decorationTypes.map(([, decorationType]) => decorationType),
    vscode.window.onDidChangeVisibleTextEditors(editors => editors.forEach(editor => void decorate(editor))),
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
