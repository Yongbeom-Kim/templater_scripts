import { CodeBlockNode, CodeLineNode, IndentNode, ListNode, ParseTreeNode, ParseTreeNodeType, ParseTreeVisitor, TextLineNode, TextNode } from "../../parser/parse_types";
import { mergeObject } from "../../utils/merge_object";
import { ClozeCodeBlockNode, ClozeCodeLineNode, ClozeIndentNode, ClozeListNode, ClozeParseTreeNode, ClozeTextLineNode, ClozeTextNode, ClozeTransformOptions } from "./cloze_types";

export const clozify = (
  tree: ParseTreeNode[],
  options: ClozeTransformOptions,
): ClozeParseTreeNode[] => {
  const visitor = new ClozifyVisitor(options);
  tree.forEach((node) => node.visit(visitor));
  return visitor.transformedNodes;
};

export class ClozifyVisitor extends ParseTreeVisitor {
  private _visitStack: ParseTreeNode[] = [];
  private _transformedNodes: ClozeParseTreeNode[] = [];
  private _cloze_number: number = 1;
  private _options: ClozeTransformOptions;

  private _spacesPerTab?: 2 | 4;

  constructor(options: ClozeTransformOptions) {
    super();
    this._options = options;
  }

  visit(node: ParseTreeNode): void {
    const prevTransformedNodesLength = this._transformedNodes.length;
    if (node instanceof TextNode) {
      this.visitTextNode(node);
    } else if (node instanceof IndentNode) {
      this.visitIndentNode(node);
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
        `Expected 1 node to be added to the transformed nodes every visit. ${node.type} ${this.debug()}`,
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
    this._transformedNodes.push(new ClozeTextNode({
      is_deletion: false,
      is_hint: false,
      cloze_index: this._cloze_number,
    }, node.contents));
    this._visitStack.pop();
  }

  visitIndentNode(node: IndentNode): void {
    if (node instanceof ClozeIndentNode) {
      throw new Error(
        `ClozeIndentNode can only be encountered after we transform the parse tree. ${this.debug()}`,
      );
    }
    if (this._spacesPerTab === undefined) {
      throw new Error(
        `IndentNode can only be encountered after we transform the parse tree and we determine spaces per tab. ${this.debug()}`,
      );
    }
    this._visitStack.push(node);
    this._transformedNodes.push(new ClozeIndentNode(node.n_spaces, node.n_tabs, this._spacesPerTab));
    this._spacesPerTab = undefined;
    this._visitStack.pop();
  }

  // No transform to do for TextLineNode
  visitTextLineNode(node: TextLineNode): void {
    this._visitStack.push(node);
    this._spacesPerTab = 2; // In text, always 2 spaces per tab. TODO: move this to options.
    this.visit(node.indent);
    const indent = this._transformedNodes.pop()! as ClozeIndentNode;
    const contents = node.contents.map((c) => {
      this.visit(c);
      return this._transformedNodes.pop()!;
    });
    this._transformedNodes.push(new ClozeTextLineNode({
      is_deletion: false,
      is_hint: false,
      cloze_index: this._cloze_number,
    }, indent, contents, node.endingNewline));
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
    let transformed_contents: ClozeParseTreeNode[] | null = null;
    for (let i = 0; i < tokens.length - 2; i++) {
      if (
        tokens[i].lexeme === " " &&
        (tokens[i + 1].lexeme === "-" || tokens[i + 1].lexeme === "=") &&
        tokens[i + 2].lexeme === " "
      ) {
        const front = tokens.slice(0, i);
        const back = tokens.slice(i + 3);
        transformed_contents = [
          new ClozeTextNode({
            is_deletion: false,
            is_hint: this._options.front,
            cloze_index: this._cloze_number,
          }, front),
          new ClozeTextNode({
            is_deletion: false,
            is_hint: false,
            cloze_index: this._cloze_number,
          }, tokens.slice(i, i + 3)),
          new ClozeTextNode({
            is_deletion: true,
            is_hint: false,
            cloze_index: this._cloze_number,
          }, back),
        ];
        this._cloze_number++;
        break;
      }
    }
    transformed_contents ??= node.contents.map((c) => {
      this.visit(c);
      return this._transformedNodes.pop()!;
    });
    this._spacesPerTab = 2; // In list, always 2 spaces per tab. TODO: move this to options.
    this.visit(node.indent);
    const indent = this._transformedNodes.pop()! as ClozeIndentNode;

    const transformed_node = new ClozeListNode(
      node.ordered,
      indent,
      node.marker,
      transformed_contents,
      node.endingNewline,
    );
    this._transformedNodes.push(transformed_node);

    this._visitStack.pop();
  }

  visitCodeBlockNode(node: CodeBlockNode): void {
    this._visitStack.push(node);
    let convertCloze = false;
    const children: ClozeCodeLineNode[] = [];
    const spacesPerTab = determineSpacesPerTab(node.contents);

    const addChild = (child: CodeLineNode) => {
      this._spacesPerTab = spacesPerTab;
      this.visit(child.indent);
      const indent = this._transformedNodes.pop()! as ClozeIndentNode;
      const contents = child.contents.map((c) => {
        this.visit(c);
        return this._transformedNodes.pop()!;
      });
      children.push(
        new ClozeCodeLineNode(
          {
            is_deletion: child.type === ParseTreeNodeType.CodeComment ? false : convertCloze,
            is_hint: false,
            cloze_index: this._cloze_number,
          },
          indent,
          contents,
          child.endingNewline,
        ),
      );
    };

    for (let i = 0; i < node.contents.length; i++) {
      const child = node.contents[i];
      if (child.type === ParseTreeNodeType.CodeComment) {
        if (convertCloze) this._cloze_number++;
        convertCloze = true;
        addChild(child);
        while (node.contents[i + 1]?.type === ParseTreeNodeType.CodeComment) {
          i++;
          addChild(node.contents[i]);
        }
      }

      if (child.type === ParseTreeNodeType.CodeLine) {
        if (child.empty() && convertCloze) {
          convertCloze = false;
          this._cloze_number++;
        }
        addChild(child);
      }
    }
    if (children.length !== node.contents.length) {
      throw new Error(
        `Expected the same number of children as the original node. Original node has ${node.contents.length} children, but transformed node has ${children.length} children. ${this.debug()}`,
      );
    }
    const transformed_node = new ClozeCodeBlockNode(
      node.language_str,
      node.language,
      children,
      spacesPerTab,
    );
    this._transformedNodes.push(transformed_node);
    this._visitStack.pop();
  }

  get transformedNodes(): ClozeParseTreeNode[] {
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

const determineSpacesPerTab = (lines: CodeLineNode[]): 2 | 4 => {
  const spaces = lines.map((l) => l.indent.n_spaces);
  if (!spaces.some((s) => s % 4 !== 0)) {
    return 4;
  }
  return 2;
};
