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
    case CodeBlockLanguage.Css:
      return (
        state.peek()[0].type === TokenType.Punctuation &&
        state.peek()[0].lexeme === "/*"
      );
    case CodeBlockLanguage.C:
    case CodeBlockLanguage.Cpp:
    case CodeBlockLanguage.Go:
    case CodeBlockLanguage.Groovy:
    case CodeBlockLanguage.JavaScript:
    case CodeBlockLanguage.Jsx:
    case CodeBlockLanguage.TypeScript:
    case CodeBlockLanguage.Tsx:
    case CodeBlockLanguage.Proto:
      return (
        state.peek()[0].type === TokenType.Punctuation &&
        (state.peek()[0].lexeme === "//" || state.peek()[0].lexeme === "/*")
      );
    case CodeBlockLanguage.Hcl:
      return (
        state.peek()[0].type === TokenType.Punctuation &&
        (state.peek()[0].lexeme === "#" ||
          state.peek()[0].lexeme === "//" ||
          state.peek()[0].lexeme === "/*")
      );
    case CodeBlockLanguage.Sql:
    case CodeBlockLanguage.Plsql:
      return (
        state.peek()[0].type === TokenType.Punctuation &&
        (state.peek()[0].lexeme === "--" || state.peek()[0].lexeme === "/*")
      );
    case CodeBlockLanguage.Python:
    case CodeBlockLanguage.Toml:
    case CodeBlockLanguage.Yaml:
    case CodeBlockLanguage.None:
      return (
        state.peek()[0].type === TokenType.Punctuation &&
        state.peek()[0].lexeme === "#"
      );
    default:
      return false;
  }
};
