import { Token, TokenType } from "../tokenizer/token_types";

export class ParserState {
  constructor(
    public readonly tokens: Token[],
    public readonly next: number = 0,
  ) {}

  good(): boolean {
    return this.next < this.tokens.length;
  }

  eof(): boolean {
    return this.next >= this.tokens.length;
  }

  isStartOfLine(): boolean {
    return (
      this.next == 0 || this.tokens[this.next - 1].type === TokenType.Newline
    );
  }

  peek(n_tokens: number = 1): Token[] {
    return this.tokens.slice(this.next, this.next + n_tokens);
  }

  consume(n_tokens: number = 1): [ParserState, Token[]] {
    const result = this.tokens.slice(this.next, this.next + n_tokens);
    return [
      new ParserState(
        this.tokens,
        Math.min(this.next + n_tokens, this.tokens.length),
      ),
      result,
    ];
  }

  consumeUntilType(
    type: TokenType,
    include: boolean = false,
  ): [ParserState, Token[]] {
    const result: Token[] = [];
    let i = this.next;
    for (; i < this.tokens.length && this.tokens[i].type !== type; i++) {
      result.push(this.tokens[i]);
    }
    if (include && i < this.tokens.length) {
      result.push(this.tokens[i]);
      i++;
    }
    return [new ParserState(this.tokens, i), result];
  }

  consumeOnlyType(type: TokenType): [ParserState, Token[]] {
    const result: Token[] = [];
    let i = this.next;
    for (; i < this.tokens.length && this.tokens[i].type === type; i++) {
      result.push(this.tokens[i]);
    }
    return [new ParserState(this.tokens, i), result];
  }

  debug(): string {
    if (this.eof()) {
      return `
      Parser State:
        Document: "${this.tokens.map((t) => t.lexeme).join("")}"
        Index: "${this.next}"
        Good: "${this.good()}"
        EOF: "${this.eof()}"
      `;
    }
    return `
    Parser State:
      Document: "${this.tokens.map((t) => t.lexeme).join("")}"
      Index: "${this.next}"
      Good: "${this.good()}"
      EOF: "${this.eof()}"
      Peek: ${this.peek()[0].lexeme}
      Peek_type: ${this.peek()[0].type}
      Peek (5): "${this.peek(5)
        .map((t) => t.lexeme)
        .join("|")}"
    `;
  }
}
export enum ParseTreeNodeType {
  Indent = "indent",
  Text = "text",
  List = "list",
}

export abstract class ParseTreeVisitor {
  abstract visit(node: ParseTreeNode): void;
}

export abstract class ParseTreeNode {
  abstract type: ParseTreeNodeType;
  visit(visitor: ParseTreeVisitor) {
    visitor.visit(this);
  }
  abstract toText(): string;
  abstract clone(): ParseTreeNode;

  static toText(tree: ParseTreeNode[]): string {
    return tree.map((n) => n.toText()).join("");
  }
}

export class IndentNode extends ParseTreeNode {
  type = ParseTreeNodeType.Indent;
  private constructor(public readonly indent?: Token) {
    super();
    if (indent && indent.type !== TokenType.Whitespace) {
      throw new Error("Indent must be a whitespace token");
    }
  }
  toText(): string {
    return this.indent?.lexeme ?? "";
  }

  clone(): IndentNode {
    return new IndentNode(this.indent);
  }

  static FromWhitespace(whitespace: Token): IndentNode {
    return new IndentNode(whitespace);
  }
}

/**
 * Node that contains some text.
 * This is the most basic node type.
 */
export class TextNode extends ParseTreeNode {
  type = ParseTreeNodeType.Text;
  constructor(public readonly contents: Token[]) {
    super();
  }
  toText(): string {
    return this.contents.map((t) => t.lexeme).join("");
  }

  static FromToken(token: Token): TextNode {
    return new TextNode([token]);
  }

  static FromTokens(tokens: Token[]): TextNode {
    return new TextNode(tokens);
  }

  clone(): TextNode {
    return new TextNode(this.contents);
  }
}

/**
 * A text line node is a node that contains a list of tokens that are not a list or a header.
 *
 * Text line nodes encompass one entire line of text,
 *  excluding the newline token at the start,
 *  including the newline token at the end.
 */
export class TextLineNode extends ParseTreeNode {
  type = ParseTreeNodeType.Text;

  constructor(
    public readonly indent: IndentNode,
    public readonly contents: ParseTreeNode[],
    public readonly endingNewline?: Token, // undefined if EOF
  ) {
    super();
  }
  toText(): string {
    return (
      this.indent.toText() +
      this.contents.map((t) => t.toText()).join("") +
      (this.endingNewline?.lexeme ?? "")
    );
  }

  clone(): TextLineNode {
    return new TextLineNode(this.indent, this.contents, this.endingNewline);
  }
}

export class ListNode extends TextLineNode {
  type = ParseTreeNodeType.List;

  constructor(
    public readonly ordered: boolean,
    public readonly indent: IndentNode,
    public readonly marker: Token[],
    public readonly contents: ParseTreeNode[],
    public readonly endingNewline?: Token, // undefined if EOF
    public readonly children: ParseTreeNode[] = [],
  ) {
    super(indent, contents, endingNewline); // This should combine indent + marker + contents, but it's okay since we don't rely on the inheritance.
  }
  toText(): string {
    return (
      this.indent.toText() +
      this.marker.map((t) => t.lexeme).join("") +
      " " +
      this.contents.map((t) => t.toText()).join("") +
      (this.endingNewline?.lexeme ?? "")
    );
  }

  clone(): ListNode {
    return new ListNode(
      this.ordered,
      this.indent,
      this.marker,
      this.contents,
      this.endingNewline,
      this.children,
    );
  }
}
