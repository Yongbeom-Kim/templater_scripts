import { Token, TokenType } from "../tokenizer/token_types";
import { isComment } from "./code_parser";
import {
  CodeBlockNode,
  CodeBlockLanguage,
  CodeCommentNode,
  CodeLineNode,
  IndentNode,
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
    [state, node] = tryParseCodeBlock(state);
    if (node) {
      result.push(node);
      continue;
    }
    [state, node] = tryParseLine(state);
    if (node) {
      result.push(node);
      continue;
    }
    throw new Error(
      `Unreachable code reached in parse function. Document: "${tokens
        .map((t) => t.lexeme)
        .join("")}", Token: "${state.peek()[0].lexeme}", Index: ${state.next}`,
    );
  }
  return result;
};

/**
 * Attempts to parse a code block from the current position
 */
const tryParseCodeBlock = (
  state: ParserState,
): [ParserState, ParseTreeNode | null] => {
  if (!state.isStartOfLine()) {
    return [state, null];
  }

  const backupState = state;
  let peeked: Token[] = [];
  let language: CodeBlockLanguage, language_str: string, backTick: Token;
  // parse starting backtick
  [state, peeked] = state.consumeUntilType(TokenType.Newline, true);
  if (
    !(
      peeked[0] &&
      peeked[0].type === TokenType.Punctuation &&
      peeked[0].lexeme === "```"
    )
  ) {
    return [backupState, null];
  }
  backTick = peeked[0];
  if (peeked.length == 2) {
    language = CodeBlockLanguage.None;
    language_str = "";
  } else {
    language_str = peeked
      .slice(1)
      .map((t) => t.lexeme)
      .join("")
      .trim();
    language = CodeBlockLanguage.FromKeyword(language_str);
  }

  // parse body
  const children: CodeLineNode[] = [];
  let parsed: CodeLineNode | null = null;
  while (state.good()) {
    [state, parsed] = parseCodeLine(language, state);
    children.push(parsed);
    if (
      state.peek()[0].type === TokenType.Punctuation &&
      state.peek()[0].lexeme === backTick.lexeme
    ) {
      break;
    }
  }

  // parse ending backtick
  [state, peeked] = state.consumeUntilType(TokenType.Newline, true);
  const endingBackTick = peeked[0];
  if (
    endingBackTick.type !== TokenType.Punctuation ||
    endingBackTick.lexeme !== "```"
  ) {
    return [backupState, null];
  }
  const endingNewline =
    peeked.length > 1 ? peeked[peeked.length - 1] : undefined;
  return [
    state,
    new CodeBlockNode(language_str, language, children, endingNewline),
  ];
};

const parseCodeLine = (
  language: CodeBlockLanguage,
  state: ParserState,
): [ParserState, CodeLineNode] => {
  let indent, contents, endingNewline, comment;
  [state, indent] = state.consumeOnlyType(TokenType.Whitespace);
  if (indent.length > 1) {
    throw new Error(
      `Assertion failed in parseCodeLine function. Whitespace tokens should all be combined into one token. Indent: "${indent.map((t) => t.lexeme).join("")}", Token Chain: "${state
        .peek()
        .map((t) => t.lexeme)
        .join("")}"`,
    );
  }
  comment = isComment(language, state);
  [state, contents] = state.consumeUntilType(TokenType.Newline, false);
  [state, [endingNewline]] = state.consume();
  if (comment) {
    return [
      state,
      new CodeCommentNode(
        IndentNode.FromWhitespace(indent[0]),
        [TextNode.FromTokens(contents)],
        endingNewline,
      ),
    ];
  }
  return [
    state,
    new CodeLineNode(
      IndentNode.FromWhitespace(indent[0]),
      [TextNode.FromTokens(contents)],
      endingNewline,
    ),
  ];
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
  if (indent.length > 1) {
    throw new Error(
      `Asssertion failed in tryParseLine function. Whitespace tokens should all be combined into one token. Indent: "${indent
        .map((t) => t.lexeme)
        .join("|")}", Token Chain: "${state
        .peek()
        .map((t) => t.lexeme)
        .join("")}"`,
    );
  }

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
        IndentNode.FromWhitespace(indent[0]),
        marker,
        [TextNode.FromTokens(content)],
        endingNewline,
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
        IndentNode.FromWhitespace(indent[0]),
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
            `Unreachable code reached in getIndentLevel function. Token: "${
              token.lexeme
            }", Token Chain: "${tokens.map((t) => t.lexeme).join("")}"`,
          );
        }
      }
      return acc;
    }
    throw new Error(
      `Unreachable code reached in getIndentLevel function. Token: "${
        token.lexeme
      }", Token Chain: "${tokens.map((t) => t.lexeme).join("")}"`,
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
