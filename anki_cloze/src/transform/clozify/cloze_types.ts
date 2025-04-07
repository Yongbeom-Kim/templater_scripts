import {
  ListNode,
  ParseTreeNodeType,
  CodeBlockNode,
  TextLineNode,
  TextNode,
  CodeLineNode,
  IndentNode,
  CodeBlockLanguage,
} from "../../parser/parse_types";

import { ParseTreeNode } from "../../parser/parse_types";

import { ParseTreeVisitor } from "../../parser/parse_types";
import { Token, TokenType } from "../../tokenizer/token_types";

export class ClozifyVisitor extends ParseTreeVisitor {
  private _visitStack: ParseTreeNode[] = [];
  private _transformedNodes: ParseTreeNode[] = [];
  private _cloze_number: number = 1;
  visit(node: ParseTreeNode): void {
    const prevTransformedNodesLength = this._transformedNodes.length;
    if (node instanceof TextNode) {
      this.visitTextNode(node);
    } else if (node instanceof ListNode) {
      // ListNode extends TextLineNode
      this.visitListNode(node);
    } else if (node instanceof TextLineNode) {
      this.visitTextLineNode(node);
    } else if (node instanceof CodeBlockNode) {
      this.visitCodeBlockNode(node);
    }
    if (this._transformedNodes.length != prevTransformedNodesLength + 1) {
      throw new Error(
        `Expected 1 node to be added to the transformed nodes every visit. ${this.debug()}`,
      );
    }
  }

  // Without any context, we cannot determine if a TextNode is a cloze deletion.
  // Therefore, we will just pass it through.
  visitTextNode(node: TextNode): void {
    if (node instanceof ClozeTextNode) {
      throw new Error(
        `ClozeTextNode can only be encountered after we transform the parse tree. ${this.debug()}`,
      );
    }
    this._visitStack.push(node);
    this._transformedNodes.push(node);
    this._visitStack.pop();
  }
  // Ah, this is where we transform the TextNode into a ClozeTextNode.
  clozifyTextNode(node: TextNode, front: boolean): void {
    if (node instanceof ClozeTextNode) {
      throw new Error(
        `ClozeTextNode can only be encountered after we transform the parse tree. ${this.debug()}`,
      );
    }
    const cloze_node = new ClozeTextNode(
      node.contents,
      this._cloze_number,
      front,
    );
    this._visitStack.push(node);
    this._transformedNodes.push(cloze_node);
    this._visitStack.pop();
  }

  // No transform to do for TextLineNode
  visitTextLineNode(node: TextLineNode): void {
    this._visitStack.push(node);
    this._transformedNodes.push(node);
    this._visitStack.pop();
  }

  /**
   * For lists, we do the following transformation:
   *
   * 1. `- TEXT` becomes `- TEXT` (no change)
   * 2. `- FRONT - BACK` becomes `- {{c1::::FRONT}} - {{c1::BACK}}`
   * 3. `- FRONT = BACK` becomes `- {{c1::::FRONT}} = {{c1::BACK}}`
   *
   */
  visitListNode(node: ListNode): void {
    if (node.contents.length !== 1) {
      throw new Error(
        `TextLineNode (before transformation) can only have one child. ${this.debug()}`,
      );
    }
    if (node.contents[0] instanceof ClozeTextNode) {
      throw new Error(
        `ClozeTextNode can only be encountered after we transform the parse tree. ${this.debug()}`,
      );
    }
    if (!(node.contents[0] instanceof TextNode)) {
      throw new Error(
        `TextLineNode (before transformation) can only have one child that is a TextNode. ${this.debug()}`,
      );
    }
    this._visitStack.push(node);

    // transform content
    const tokens = node.contents[0].contents;
    let transformed_contents: ParseTreeNode[] | null = null;
    for (let i = 0; i < tokens.length - 2; i++) {
      if (
        tokens[i].lexeme === " " &&
        (tokens[i + 1].lexeme === "-" || tokens[i + 1].lexeme === "=") &&
        tokens[i + 2].lexeme === " "
      ) {
        const front = tokens.slice(0, i);
        const back = tokens.slice(i + 3);
        transformed_contents = [
          new ClozeTextNode(front, this._cloze_number, true),
          new TextNode(tokens.slice(i, i + 3)),
          new ClozeTextNode(back, this._cloze_number, false),
        ];
        this._cloze_number++;
        break;
      }
    }
    transformed_contents ??= node.contents;

    // Visit children
    const transformedChildren: ParseTreeNode[] = [];
    for (const child of node.children) {
      this.visit(child);
      transformedChildren.push(this._transformedNodes.pop()!);
    }

    const transformed_node = new ListNode(
      node.ordered,
      node.indent,
      node.marker,
      transformed_contents,
      node.endingNewline,
      transformedChildren,
    );
    this._transformedNodes.push(transformed_node);

    this._visitStack.pop();
  }

  visitCodeBlockNode(node: CodeBlockNode): void {
    this._visitStack.push(node);
    let convertCloze = false;
    const children = [];
    for (let i = 0; i < node.contents.length; i++) {
      const child = node.contents[i];
      if (child.type === ParseTreeNodeType.CodeComment) {
        while (
          i + 1 < node.contents.length &&
          node.contents[i + 1].type === ParseTreeNodeType.CodeComment
        ) {
          children.push(node.contents[i]);
          i++;
        }
        convertCloze = true;
      } else if (child.type === ParseTreeNodeType.CodeLine) {
        if (!(child instanceof CodeLineNode))
          throw new Error(`Expected CodeLineNode. ${this.debug()}`);

        if (child.empty() && convertCloze) {
          convertCloze = false;
          this._cloze_number++;
        }

        if (!child.empty() && convertCloze) {
          children.push(
            ClozeCodeLineNode.FromCodeLineNode(child, this._cloze_number),
          );
          continue;
        }
      }
      children.push(child);
    }
    if (children.length !== node.contents.length) {
      throw new Error(
        `Expected the same number of children as the original node. ${this.debug()}`,
      );
    }
    const transformed_node = new ClozeCodeBlockNode(
      node.language_str,
      node.language,
      children,
    );
    this._transformedNodes.push(transformed_node);
    this._visitStack.pop();
  }

  get transformedNodes(): ParseTreeNode[] {
    return this._transformedNodes;
  }

  debug(): string {
    const printStack = (stack: ParseTreeNode[]): string => {
      let result = "";
      let depth = 0;
      for (const node of stack) {
        result += "  ".repeat(depth) + node.toText() + "\n";
        depth++;
      }
      return result;
    };
    return printStack(this._visitStack);
  }
}

export class ClozeCodeBlockNode extends CodeBlockNode {
  type = ParseTreeNodeType.CodeBlock;
  constructor(
    public readonly language_str: string,
    public readonly language: CodeBlockLanguage,
    public readonly contents: ParseTreeNode[],
  ) {
    super(language_str, language, contents);
  }

  toText(): string {
    return `<pre style="white-space: pre-wrap; overflow-wrap: normal;">\n<code class="language-${this.language}">\n${this.contents.map((t) => t.toText()).join("")}</code>\n</pre>`;
  }

  clone(): ClozeCodeBlockNode {
    return new ClozeCodeBlockNode(this.language_str, this.language, this.contents.map((t) => t.clone()));
  }
}
/**
 * A text node that is specifically for cloze deletion.
 *
 * A cloze deletion is a text node that is enclosed in Anki's cloze deletion delimiters.
 *
 * Cloze deletions come in two flavors:
 *  - Front: Text is shown to the user before the cloze is revealed.
 *  - Back: Text is shown to the user after the cloze is revealed.
 *
 * When this node is converted to text, it will enclose its contents in Anki's cloze deletion delimiters.
 *
 * For a contents of "Hello, world!" (replace 1 with the number of the cloze):
 *  - if front is true: "{{c1::::Hello, world!}}"
 *  - if front is false: "{{c1::Hello, world!}}"
 */
export class ClozeTextNode extends TextNode {
  type = ParseTreeNodeType.Text;
  constructor(
    public readonly contents: Token[],
    public readonly cloze_number: number,
    public readonly front: boolean,
  ) {
    super(contents);
  }

  toText(): string {
    return `{{c${this.cloze_number}${
      this.front ? "::::" : "::"
    }${super.toText()}}}`;
  }

  clone(): ClozeTextNode {
    return new ClozeTextNode(this.contents, this.cloze_number, this.front);
  }
}

export class ClozeCodeLineNode extends CodeLineNode {
  type = ParseTreeNodeType.CodeLine;
  constructor(
    public readonly cloze_number: number,
    public readonly indent: IndentNode,
    public readonly contents: ParseTreeNode[],
    public readonly endingNewline?: Token, // undefined if EOF
  ) {
    super(indent, contents, endingNewline);
  }
  toText(): string {
    return `{{c${this.cloze_number}::${this.indent.toText() +
      this.contents.map((t) => t.toText()).join("")}}}${this.endingNewline?.lexeme ?? ""}`;
  }

  static FromCodeLineNode(
    node: CodeLineNode,
    cloze_number: number,
  ): ClozeCodeLineNode {
    return new ClozeCodeLineNode(
      cloze_number,
      node.indent,
      node.contents,
      node.endingNewline,
    );
  }
}
