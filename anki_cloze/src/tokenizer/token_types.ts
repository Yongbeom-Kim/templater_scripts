export enum TokenType {
  Text = "text",
  Number = "number",  
  Punctuation = "punctuation",
  Newline = "newline", // one or more consecutive newlines
  Whitespace = "whitespace" // one or more consecutive spaces or tabs
}

export type Token = {
  type: TokenType;
  lexeme: string;
  line_pos: number;
  col_pos: number;
}

export namespace Token {
  export const Create = (state: TokenizerState, type: TokenType, lexeme: string): Token => {
    return {
      type,
      lexeme,
      line_pos: state.line_pos,
      col_pos: state.col_pos
    }
  }
}
export class TokenizerState {
  constructor(
    readonly text: string,
    readonly next: number = 0,
    readonly line_pos: number = 1,
    readonly col_pos: number = 0
  ) {
  }
  
  eof(): boolean {
    return this.next >= this.text.length;
  }

  good(): boolean {
    return this.next < this.text.length;
  }

  peek(n_chars: number): string {
    return this.consume(n_chars)[1];
  }

  private getUpdatedPosition(textConsumed: string): [number, number] {
    let newLinePos = this.line_pos;
    let newColPos = this.col_pos;
    if (!textConsumed.includes("\n")) {
      newColPos += textConsumed.length;
    } else {
      const newLines = textConsumed.split("\n").length - 1;
      newLinePos += newLines;
      newColPos = textConsumed.length - textConsumed.lastIndexOf("\n") - 1;
    }
    return [newLinePos, newColPos];
  }

  consume(n_chars: number): [TokenizerState, string] {
    const newText = this.text.slice(this.next, this.next + n_chars);
    const [newLinePos, newColPos] = this.getUpdatedPosition(newText);
    return [new TokenizerState(this.text, this.next + n_chars, newLinePos, newColPos), newText];
  }

  peekUntil(predicate: (char: string) => boolean, max_chars: number = -1): string {
    return this.consumeUntil(predicate, max_chars)[1];
  }

  consumeUntil(predicate: (char: string) => boolean, max_chars: number = -1): [TokenizerState, string] {
    let result = "";
    let idx = this.next;
    while (max_chars != 0 && idx < this.text.length && !predicate(this.text[idx])) {
      result += this.text[idx];
      idx++;
      max_chars--;
    }
    const [newLinePos, newColPos] = this.getUpdatedPosition(result);
    return [new TokenizerState(this.text, idx, newLinePos, newColPos), result];
  }

  isStartOfLine(): boolean {
    return this.next == 0 || this.text[this.next - 1] == "\n";
  }
}