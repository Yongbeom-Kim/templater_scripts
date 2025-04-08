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

  consumeUntilLexeme(
    lexeme: string,
    include: boolean = false,
  ): [ParserState, Token[]] {
    const result: Token[] = [];
    let i = this.next;
    for (; i < this.tokens.length && this.tokens[i].lexeme !== lexeme; i++) {
      result.push(this.tokens[i]);
    }
    if (include && i < this.tokens.length) {
      result.push(this.tokens[i]);
      i++;
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
  CodeBlock = "code_block",
  CodeLine = "code_line",
  CodeComment = "code_comment",
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

  static toText(tree: ParseTreeNode[]): string {
    return tree.map((n) => n.toText()).join("");
  }
}

export class IndentNode extends ParseTreeNode {
  type = ParseTreeNodeType.Indent;
  n_spaces: number;
  n_tabs: number;
  private constructor(public readonly indent?: Token) {
    super();
    if (indent && indent.type !== TokenType.Whitespace) {
      throw new Error("Indent must be a whitespace token");
    }
    this.n_spaces = [...(indent?.lexeme ?? "")].filter((c) => c === " ").length;
    this.n_tabs = [...(indent?.lexeme ?? "")].filter((c) => c === "\t").length;
  }
  toText(): string {
    return this.indent?.lexeme ?? "";
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
}

export class ListNode extends TextLineNode {
  type = ParseTreeNodeType.List;

  constructor(
    public readonly ordered: boolean,
    public readonly indent: IndentNode,
    public readonly marker: Token[],
    public readonly contents: ParseTreeNode[],
    public readonly endingNewline?: Token, // undefined if EOF
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
}

export enum CodeBlockLanguage {
  Css = "css",
  C = "c",
  Cpp = "cpp",
  Go = "go",
  Groovy = "groovy",
  Hcl = "hcl",
  JavaScript = "javascript",
  Jsx = "jsx",
  TypeScript = "typescript",
  Tsx = "tsx",
  Python = "python",
  Plsql = "plsql",
  Sql = "sql",
  Toml = "toml",
  Yaml = "yaml",
  None = "",
}

export namespace CodeBlockLanguage {
  // TODO: move to parser, this shouldn't be here
  export const FromKeyword = (keyword?: string): CodeBlockLanguage => {
    if (!keyword) {
      console.warn(
        "No keyword provided when parsing code block language. Expected a language name.",
      );
      return CodeBlockLanguage.None;
    }
    switch (keyword.toLowerCase()) {
      case "css":
        return CodeBlockLanguage.Css;
      case "c":
        return CodeBlockLanguage.C;
      case "cpp":
      case "c++":
        return CodeBlockLanguage.Cpp;
      case "go":
        return CodeBlockLanguage.Go;
      case "groovy":
        return CodeBlockLanguage.Groovy;
      case "hcl":
        return CodeBlockLanguage.Hcl;
      case "javascript":
      case "js":
        return CodeBlockLanguage.JavaScript;
      case "jsx":
        return CodeBlockLanguage.Jsx;
      case "typescript":
      case "ts":
        return CodeBlockLanguage.TypeScript;
      case "tsx":
        return CodeBlockLanguage.Tsx;
      case "python":
      case "py":
        return CodeBlockLanguage.Python;
      case "plsql":
        return CodeBlockLanguage.Plsql;
      case "sql":
        return CodeBlockLanguage.Sql;
      case "toml":
        return CodeBlockLanguage.Toml;
      case "yaml":
      case "yml":
        return CodeBlockLanguage.Yaml;
      default:
        console.warn(
          `Unrecognized keyword when parsing code block language: ${keyword}`,
        );
        return CodeBlockLanguage.None;
    }
  };
}

export class CodeBlockNode extends ParseTreeNode {
  type = ParseTreeNodeType.CodeBlock;
  constructor(
    public readonly language_str: string,
    public readonly language: CodeBlockLanguage,
    public readonly contents: CodeLineNode[],
    public readonly endingNewline?: Token, // undefined if EOF
  ) {
    super();
    for (const content of contents) {
      if (
        content.type !== ParseTreeNodeType.CodeLine &&
        content.type !== ParseTreeNodeType.CodeComment
      ) {
        throw new Error(
          "Code block contents must be code line or code comment nodes",
        );
      }
    }
  }

  toText(): string {
    return `\`\`\`${this.language_str}\n${this.contents
      .map((t) => t.toText())
      .join("")}\`\`\`${this.endingNewline?.lexeme ?? ""}`;
  }
}

export class CodeLineNode extends ParseTreeNode {
  type = ParseTreeNodeType.CodeLine;
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
  empty(): boolean {
    // TODO: Do better
    return this.toText().trim().length === 0;
  }
}

export class CodeCommentNode extends CodeLineNode {
  type = ParseTreeNodeType.CodeComment;
}
