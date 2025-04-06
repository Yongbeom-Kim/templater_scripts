import { Token, TokenType } from "../tokenizer/types";
import { ListNode, ParseTreeNode, ParserState, TextLineNode } from "./types";

export const parse = (tokens: Token[]): ParseTreeNode[] => {
  const result: ParseTreeNode[] = [];
  let state = new ParserState(tokens);
  while (state.good()) {
    let node: ParseTreeNode | null = null;
    [state, node] = tryParseList(state);
    if (node) {
      result.push(node);
      continue;
    }
    [state, node] = tryParseLine(state);
    if (node) {
      result.push(node);
      continue;
    }
    throw new Error(`Unreachable code reached in parse function. Document: "${tokens.map(t => t.lexeme).join("")}", Token: "${state.peek()[0].lexeme}", Index: ${state.next}`);
  }
  return result;
};

const tryParseList = (
  state: ParserState
): [ParserState, ParseTreeNode | null] => {
  if (!state.isStartOfLine()) {
    return [state, null];
  }
  let newState = state, ordered, indent, marker, content, endingNewline;
  [newState, indent] = state.consumeOnlyType(TokenType.Whitespace);
  if (peekUnorderedListMarker(newState)) {
    ordered = false;
  } else if (peekOrderedListMarker(newState)) {
    ordered = true;
  } else {
    return [state, null];
  }
  [newState, marker] = newState.consumeUntilType(TokenType.Whitespace, false);
  [newState] = newState.consume();
  [newState, content] = newState.consumeUntilType(TokenType.Newline, false);
  [newState, [endingNewline]] = newState.consume();
  return [newState, new ListNode(ordered, getIndentLevel(indent), marker, content, endingNewline, [])];
}


/**
 * Parse a line of text, from the start of a line to the end of the line.
 */
const tryParseLine = (
  state: ParserState
): [ParserState, ParseTreeNode | null] => {
  if (!state.isStartOfLine()) {
    return [state, null];
  }
  let indent, newState = state, tokens, endingNewline;
  [newState, indent] = state.consumeOnlyType(TokenType.Whitespace);
  [newState, tokens] = newState.consumeUntilType(TokenType.Newline, false);
  [newState, [endingNewline]] = newState.consume();
  if (tokens.length > 0 || endingNewline || newState.eof()) {
    return [newState, new TextLineNode(getIndentLevel(indent), tokens, endingNewline)];
  }
  console.warn(`Start of line, but no tokens found. This should be unreachable. ${newState.debug()}`);
  return [state, null];
};


const getIndentLevel = (tokens: Token[]): number => {
  const level = tokens.reduce((acc, token) => {
    if (token.type === TokenType.Whitespace) {
      for (let i = 0; i < token.lexeme.length; i++) {
        if (token.lexeme[i] === " ") {
          acc += 1/2;
        } else if (token.lexeme[i] === "\t") {
          acc += 1;
        } else {
          throw new Error(`Unreachable code reached in getIndentLevel function. Token: "${token.lexeme}", Token Chain: "${tokens.map(t => t.lexeme).join("")}"`);
        }
      }
      return acc;
    }
    throw new Error(`Unreachable code reached in getIndentLevel function. Token: "${token.lexeme}", Token Chain: "${tokens.map(t => t.lexeme).join("")}"`);
  }, 0);
  return Math.ceil(level);
};

const peekUnorderedListMarker = (state: ParserState): boolean => {
  const tokens = state.peek(2);
  return (
    tokens.length >= 2 &&
    tokens[0].type === TokenType.Punctuation &&
    (tokens[0].lexeme === "-" || tokens[0].lexeme === "*") &&
    tokens[1].type === TokenType.Whitespace
  )
}

const peekOrderedListMarker = (state: ParserState): boolean => {
  const tokens = state.peek(3);
  return (
    tokens.length >= 3 &&
    tokens[0].type === TokenType.Number &&
    tokens[1].type === TokenType.Punctuation &&
    tokens[1].lexeme === "." &&
    tokens[2].type === TokenType.Whitespace
  )
}
