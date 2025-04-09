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
  TableAlignment,
  TableHeaderNode,
  TableCellNode,
  TableRowNode,
  TableNode,
} from "./parse_types";

export const parse = (tokens: Token[]): ParseTreeNode[] => {
  const result: ParseTreeNode[] = [];
  let state = new ParserState(tokens);
  while (state.good()) {
    let node: ParseTreeNode | null = null;
    [state, node] = tryParseTable(state);
    if (node) {
      result.push(node);
      continue;
    }
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
        .join("")}", Token: "${state.peek()[0].lexeme}", Index: ${state.next}`
    );
  }
  return result;
};

const tryParseTable = (
  state: ParserState
): [ParserState, ParseTreeNode | null] => {
  if (!state.isStartOfLine()) {
    return [state, null];
  }
  const backupState = state;
  let headerCells, headerAlignment, rowCells;

  // Try to parse the table header row
  [state, headerCells] = tryParseTableRow(state);
  if (!headerCells) {
    return [backupState, null];
  }

  // Try to parse the table header separator
  [state, headerAlignment] = tryParseTableHeaderSeparator(state);
  if (!headerAlignment) {
    return [backupState, null];
  }

  // row[i] = ith row of table
  // row[i][j] = jth cell of ith row
  // row[i][j][k] = kth token of jth cell of ith row
  const rows: Token[][][] = [];
  while (true) {
    [state, rowCells] = tryParseTableRow(state);
    if (!rowCells) {
      break;
    }
    rows.push(rowCells);
  }

  const colWidths = headerCells.map((headerCell, colIdx) =>
    Math.max(
      headerCell.length,
      ...rows.map(row => {
        const cell = row[colIdx] || [];
        return cell.reduce((sum, token) => sum + token.lexeme.length, 0);
      })
    )
  );

  const headerNode = new TableHeaderNode(
    headerCells.map((cell, index) =>
      new TableCellNode(cell, headerAlignment[index], colWidths[index])
    )
  );
  const rowsNode = rows.map(row => new TableRowNode(
    row.map((cell, index) =>
      new TableCellNode(cell, headerAlignment[index], colWidths[index])
    )
  ));

  return [state, new TableNode(headerNode, rowsNode)];
};

/**
 * Attempts to parse a table row from the current position
 * @param state - The current parser state
 * @returns A tuple containing the new parser state and the parsed table row
 * each cell in the row is represented as a list of tokens
 */
const tryParseTableRow = (
  state: ParserState
): [ParserState, Token[][] | null] => {
  if (state.eof()) {
    return [state, null];
  }
  const backupState = state;
  let content: Token[], endingNewline: Token | undefined;
  [state, content] = state.consumeUntilType(TokenType.Newline, false);
  [state, [endingNewline]] = state.consume();
  if (
    endingNewline &&
    (endingNewline.type !== TokenType.Newline ||
    endingNewline.lexeme !== "\n")
  ) {
    return [backupState, null];
  }

  const cells: Token[][] = [];
  for (let i = 0; i < content.length; ) {
    const cell = content[i];
    if (cell.type !== TokenType.Punctuation || cell.lexeme !== "|") {
      return [backupState, null];
    }
    i++;
    if (i == content.length) {
      break;
    }
    if (content[i].type === TokenType.Whitespace) {
      i++;
    }
    const cellContent: Token[] = [];
    while (i < content.length && content[i].lexeme !== "|") {
      cellContent.push(content[i]);
      i++;
    }
    if (cellContent[cellContent.length - 1].type === TokenType.Whitespace) {
      cellContent.pop();
    }
    cells.push(cellContent);
  }

  return [state, cells];
};

const tryParseTableHeaderSeparator = (
  state: ParserState
): [ParserState, TableAlignment[] | null] => {
  const backupState = state;
  let alignment: TableAlignment[] = [];
  let peeked: Token[] = [];
  let endingNewline: Token | undefined;
  [state, peeked] = state.consumeUntilType(TokenType.Newline, false);
  [state, [endingNewline]] = state.consume();
  for (let i = 0; i < peeked.length; i++) {
    switch (peeked[i].type) {
      case TokenType.Whitespace:
        continue;
      case TokenType.Punctuation:
        if (/^\|?:-+:\|?$/.test(peeked[i].lexeme)) {
          alignment.push("center");
        } else if (/^\|?:-+\|?$/.test(peeked[i].lexeme)) {
          alignment.push("left");
        } else if (/^\|?-+:\|?$/.test(peeked[i].lexeme)) {
          alignment.push("right");
        } else if (/^\|?-+\|?$/.test(peeked[i].lexeme)) {
          alignment.push("none");
        } else if (peeked[i].lexeme === "|") {
          continue;
        } else {
          console.error(
            `Invalid table header separator alignment: "${peeked[i].lexeme}"`
          );
          return [backupState, null];
        }
        break;
      default:
        console.error(
          `Invalid table header separator alignment: "${peeked[i].lexeme}"`
        );
        return [backupState, null];
    }
  }
  return [state, alignment];
};

/**
 * Attempts to parse a code block from the current position
 */
const tryParseCodeBlock = (
  state: ParserState
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
  state: ParserState
): [ParserState, CodeLineNode] => {
  let indent, contents, endingNewline, comment;
  [state, indent] = state.consumeOnlyType(TokenType.Whitespace);
  if (indent.length > 1) {
    throw new Error(
      `Assertion failed in parseCodeLine function. Whitespace tokens should all be combined into one token. Indent: "${indent
        .map((t) => t.lexeme)
        .join("")}", Token Chain: "${state
        .peek()
        .map((t) => t.lexeme)
        .join("")}"`
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
        endingNewline
      ),
    ];
  }
  return [
    state,
    new CodeLineNode(
      IndentNode.FromWhitespace(indent[0]),
      [TextNode.FromTokens(contents)],
      endingNewline
    ),
  ];
};

/**
 * Attempts to parse either a list item or a text line from the current position
 */
const tryParseLine = (
  state: ParserState
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
        .join("")}"`
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
        endingNewline
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
        endingNewline
      ),
    ];
  }

  console.warn(
    `Start of line, but no tokens found. This should be unreachable. ${newState.debug()}`
  );
  return [state, null];
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
