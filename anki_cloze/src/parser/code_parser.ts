import { Token, TokenType } from "../tokenizer/token_types";
import { CodeBlockLanguage, ParserState } from "./parse_types";

export const isComment = (
  language: CodeBlockLanguage,
  state: ParserState,
): boolean => {
  if (state.eof()) {
    throw new Error(
      `Parser state in EOF in middle of code block. ${state.debug()}`,
    );
  }

  [state] = state.consumeOnlyType(TokenType.Whitespace);

  switch (language) {
    case CodeBlockLanguage.None:
      return state.peek()[0].lexeme === "#" || state.peek()[0].lexeme === "//";
    case CodeBlockLanguage.Python:
      return state.peek()[0].lexeme === "#";
    case CodeBlockLanguage.Cpp:
      return state.peek()[0].lexeme === "/*" || state.peek()[0].lexeme === "//";
    default:
      return false;
  }
};
