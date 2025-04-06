import { Token, TokenType } from "../tokenizer/token_types";
import {
  ListNode,
  ParseTreeNode,
  ParserState,
  TextLineNode,
  TextNode,
} from "./parse_types";

export const parse = (tokens: Token[]): ParseTreeNode[] => {
  const result: ParseTreeNode[] = [];
  let state = new ParserState(tokens);
  while (state.good()) {
    let node: ParseTreeNode | null = null;
    [state, node] = tryParseLine(state);
    if (node) {
      result.push(node);
      continue;
    }
    throw new Error(
      `Unreachable code reached in parse function. Document: "${tokens.map((t) => t.lexeme).join("")}", Token: "${state.peek()[0].lexeme}", Index: ${state.next}`,
    );
  }
  return result;
};

/**
 * Attempts to parse either a list item or a text line from the current position
 */
const tryParseLine = (
  state: ParserState,
): [ParserState, ParseTreeNode | null] => {
  if (!state.isStartOfLine()) {
    return [state, null];
  }

  let newState = state,
    indent,
    marker,
    content,
    endingNewline;
  [newState, indent] = state.consumeOnlyType(TokenType.Whitespace);

  // Check for list markers first
  if (peekUnorderedListMarker(newState) || peekOrderedListMarker(newState)) {
    const ordered = peekOrderedListMarker(newState);
    [newState, marker] = newState.consumeUntilType(TokenType.Whitespace, false);
    [newState] = newState.consume();
    [newState, content] = newState.consumeUntilType(TokenType.Newline, false);
    [newState, [endingNewline]] = newState.consume();
    return [
      newState,
      new ListNode(
        ordered,
        getIndentLevel(indent),
        marker,
        [TextNode.FromTokens(content)],
        endingNewline,
        [],
      ),
    ];
  }

  // If not a list, treat as regular text line
  [newState, content] = newState.consumeUntilType(TokenType.Newline, false);
  [newState, [endingNewline]] = newState.consume();
  if (content.length > 0 || endingNewline || newState.eof()) {
    return [
      newState,
      new TextLineNode(
        getIndentLevel(indent),
        [TextNode.FromTokens(content)],
        endingNewline,
      ),
    ];
  }

  console.warn(
    `Start of line, but no tokens found. This should be unreachable. ${newState.debug()}`,
  );
  return [state, null];
};

const getIndentLevel = (tokens: Token[]): number => {
  const level = tokens.reduce((acc, token) => {
    if (token.type === TokenType.Whitespace) {
      for (let i = 0; i < token.lexeme.length; i++) {
        if (token.lexeme[i] === " ") {
          acc += 1 / 2;
        } else if (token.lexeme[i] === "\t") {
          acc += 1;
        } else {
          throw new Error(
            `Unreachable code reached in getIndentLevel function. Token: "${token.lexeme}", Token Chain: "${tokens.map((t) => t.lexeme).join("")}"`,
          );
        }
      }
      return acc;
    }
    throw new Error(
      `Unreachable code reached in getIndentLevel function. Token: "${token.lexeme}", Token Chain: "${tokens.map((t) => t.lexeme).join("")}"`,
    );
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
  );
};

const peekOrderedListMarker = (state: ParserState): boolean => {
  const tokens = state.peek(3);
  return (
    tokens.length >= 3 &&
    tokens[0].type === TokenType.Number &&
    tokens[1].type === TokenType.Punctuation &&
    tokens[1].lexeme === "." &&
    tokens[2].type === TokenType.Whitespace
  );
};
