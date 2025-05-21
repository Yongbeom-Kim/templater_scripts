import { Token, TokenizerState, TokenType } from "./token_types";

// TODO: Consider converting to stream-based tokenizer if performance becomes an issue
export const tokenize = (text: string): Token[] => {
  // Normalize newlines
  text = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");

  const tokens: Token[] = [];
  let state = new TokenizerState(text);
  while (state.good()) {
    let lexeme;
    let updatedState;
    if (isText(state.peek(1))) {
      [updatedState, lexeme] = state.consumeUntil(not(isText));
      tokens.push(Token.Create(state, TokenType.Text, lexeme));
    } else if (isDigit(state.peek(1))) {
      [updatedState, lexeme] = state.consumeUntil(not(isDigit));
      tokens.push(Token.Create(state, TokenType.Number, lexeme));
    } else if (isSpace(state.peek(1))) {
      [updatedState, lexeme] = state.consumeUntil(not(isSpace));
      tokens.push(Token.Create(state, TokenType.Whitespace, lexeme));
    } else if (isNewline(state.peek(1))) {
      [updatedState, lexeme] = state.consume(1);
      tokens.push(Token.Create(state, TokenType.Newline, lexeme));
    } else if (isPunctuation(state.peek(1))) {
      [updatedState, lexeme] = state.consumeUntil(not(isPunctuation));
      tokens.push(Token.Create(state, TokenType.Punctuation, lexeme));
    } else {
      throw new Error(`Unexpected character: "${state.peek(1)}". Index: (${state.line_pos}, ${state.col_pos}). Context: ${state.peek(5)}...`);
    }
    state = updatedState;
  }
  return tokens;
};

const isText = (c: string): boolean => {
  return !!c.match(/[a-zA-Z_]/);
};

const isDigit = (c: string): boolean => {
  return !!c.match(/\d/);
};

const isSpace = (c: string): boolean => {
  // \u00A0 is a non-breaking space
  return c == " " || c == "\t" || c == "\u00A0";
};

const isNewline = (c: string): boolean => {
  return c == "\n";
};

const isPunctuation = (c: string): boolean => {
  return !!c.match(/[^\w\s]/);
};

const not = (predicate: (...args: any[]) => boolean) => {
  return (...args: any[]) => !predicate(...args);
};
