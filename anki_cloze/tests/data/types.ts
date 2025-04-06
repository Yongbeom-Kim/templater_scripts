import { ParseTreeNode } from "../../src/parser/parse_types";
import { Token } from "../../src/tokenizer/token_types";

export type TestCase = {
  description: string;
  input: string;
  tokenize_expect: (result: Token[]) => void;
  parse_expect: (result: ParseTreeNode[]) => void;
}