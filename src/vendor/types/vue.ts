import type { Expression, SourceLocation } from "estree";


// Stand-in for the subset of the vue-eslint-parser AST that the vendored code relies on.
// src/vue.ts converts the AST of the Vue compiler into this shape.

export declare namespace AST {
  interface Located {
    loc: SourceLocation;
    range: [number, number];
  }

  interface VIdentifier extends Located {
    name: string;
    rawName: string;
    type: "VIdentifier";
  }

  interface VLiteral extends Located {
    parent: VAttribute;
    type: "VLiteral";
    value: string;
  }

  interface VExpressionContainer extends Located {
    expression: Expression | null;
    parent: Located & { type: string; };
    type: "VExpressionContainer";
  }

  interface VDirectiveKey extends Located {
    argument: VExpressionContainer | VIdentifier | null;
    name: VIdentifier;
    type: "VDirectiveKey";
  }

  interface VAttribute extends Located {
    directive: false;
    key: VIdentifier;
    parent: VStartTag;
    type: "VAttribute";
    value: VLiteral | null;
  }

  interface VDirective extends Located {
    directive: true;
    key: VDirectiveKey;
    parent: VStartTag;
    type: "VAttribute";
    value: VExpressionContainer | null;
  }

  interface VStartTag extends Located {
    attributes: (VAttribute | VDirective)[];
    parent: Located & { type: string; };
    type: "VStartTag";
  }
}
