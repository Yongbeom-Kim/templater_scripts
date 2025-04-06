import { Token, TokenType } from "../tokenizer/types";

export class ParserState {
  constructor(
    public readonly tokens: Token[],
    public readonly next: number = 0
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
        Math.min(this.next + n_tokens, this.tokens.length)
      ),
      result,
    ];
  }

  consumeUntilType(
    type: TokenType,
    include: boolean = false
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
  Text = "text",
  List = "list",
}

export abstract class ParseTreeNode {
  abstract type: ParseTreeNodeType;
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
    public readonly indent_level: number,
    public readonly contents: Token[],
    public readonly endingNewline: Token
  ) {
    super();
  }
}

export class ListNode extends TextLineNode {
  type = ParseTreeNodeType.List;

  constructor(
    public readonly ordered: boolean,
    public readonly indent_level: number,
    public readonly marker: Token[],
    public readonly contents: Token[],
    public readonly endingNewline: Token,
    public readonly children: ParseTreeNode[]
  ) {
    super(indent_level, contents, endingNewline);
  }
}
