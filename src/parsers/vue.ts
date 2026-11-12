import { parse } from "@vue/compiler-dom/dist/compiler-dom.esm-browser.prod.js";

import { parseExpression, parseStatements } from "./es.js";

import type {
  AttributeNode,
  DirectiveNode,
  ElementNode,
  ExpressionNode,
  SourceLocation,
  TemplateChildNode
} from "@vue/compiler-dom";
import type { Program } from "estree";

import type { Lang, ParsedScript } from "./es.js";


// Values of the `NodeTypes` enum of the Vue compiler, which is only available as a type.
const ELEMENT = 1;
const SIMPLE_EXPRESSION = 4;
const INTERPOLATION = 5;
const ATTRIBUTE = 6;

// The values of these directives aren't plain expressions.
const SKIPPED_DIRECTIVES = new Set(["for", "slot"]);

// Converts the template into the shape of the vue-eslint-parser AST, which the vendored code expects.
// Scripts are left out because they are parsed with oxc like any other file.
export function parseVueTemplate(text: string, lang: Lang): ParsedScript | undefined {
  const errors: unknown[] = [];

  const root = parse(text, {
    // The browser build decodes entities with `document`, which doesn't exist in the extension host.
    // The converted AST only uses offsets into the original text, so nothing needs to be decoded.
    decodeEntities: value => value,
    onError: error => errors.push(error),
    parseMode: "sfc"
  });

  let hasUnparsableExpression = false;

  const convertChildren = (children: TemplateChildNode[]): unknown[] => children.flatMap((child): unknown[] => {
    if(child.type === ELEMENT){ return [convertElement(child)]; }
    if(child.type === INTERPOLATION){ return [createExpressionContainer(child.content, getRange(child.loc))]; }
    return [];
  });

  const convertElement = (element: ElementNode) => ({
    children: convertChildren(element.children),
    range: getRange(element.loc),
    startTag: {
      attributes: element.props.map(prop => prop.type === ATTRIBUTE ? convertAttribute(prop) : convertDirective(prop)),
      range: getRange(element.loc),
      type: "VStartTag"
    },
    type: "VElement"
  });

  const convertDirective = (directive: DirectiveNode) => {
    const start = directive.loc.start.offset;
    const name = createIdentifier(directive.name, [start, start + directive.rawName!.length]);

    const argument = directive.arg?.type === SIMPLE_EXPRESSION && directive.arg.isStatic
      ? createIdentifier(directive.arg.content, getRange(directive.arg.loc))
      : null;

    const value = directive.exp && !SKIPPED_DIRECTIVES.has(directive.name)
      ? createExpressionContainer(directive.exp, getRange(directive.exp.loc), directive.name === "on")
      : null;

    return {
      directive: true,
      key: { argument, name, range: [start, (argument ?? name).range[1]], type: "VDirectiveKey" },
      range: getRange(directive.loc),
      type: "VAttribute",
      value
    };
  };

  const createExpressionContainer = (expression: ExpressionNode, range: [number, number], isHandler = false) => {
    const start = expression.loc.start.offset;
    const source = text.slice(start, expression.loc.end.offset);
    const program = isHandler ? parseStatements(lang, source, start) : parseExpression(lang, source, start);

    if(!program){
      hasUnparsableExpression = true;
      return null;
    }

    const [statement] = program.body;

    const parsed = isHandler
      ? { body: program.body, range, type: "VOnExpression" }
      : statement?.type === "ExpressionStatement" ? statement.expression : null;

    return { expression: parsed, range, type: "VExpressionContainer" };
  };

  const templates = root.children.filter((child): child is ElementNode => {
    return child.type === ELEMENT && child.tag === "template" && isHtmlTemplate(child);
  });

  const body = templates.flatMap(template => convertChildren(template.children));

  if(errors.length > 0 || hasUnparsableExpression){ return; }

  const program = { body, range: [0, text.length], type: "VueTemplate" };

  return { comments: [], program: program as unknown as Program };
}

function convertAttribute(attribute: AttributeNode) {
  return {
    directive: false,
    key: { ...createIdentifier(attribute.name.toLowerCase(), getRange(attribute.nameLoc)), rawName: attribute.name },
    range: getRange(attribute.loc),
    type: "VAttribute",
    value: attribute.value
      ? { range: getRange(attribute.value.loc), type: "VLiteral", value: attribute.value.content }
      : null
  };
}

function isHtmlTemplate(template: ElementNode) {
  const lang = template.props.find((prop): prop is AttributeNode => prop.type === ATTRIBUTE && prop.name === "lang");
  return !lang?.value || lang.value.content === "html";
}

function createIdentifier(name: string, range: [number, number]) {
  return { name, range, rawName: name, type: "VIdentifier" };
}

function getRange(loc: SourceLocation): [number, number] {
  return [loc.start.offset, loc.end.offset];
}
