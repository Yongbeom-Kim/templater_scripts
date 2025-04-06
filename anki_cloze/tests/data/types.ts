import { ParseTreeNode } from "../../src/parser/types";
import { Token } from "../../src/tokenizer/types";

export type TestCase = {
  description: string;
  input: string;
  tokenize_expect: (result: Token[]) => void;
  parse_expect: (result: ParseTreeNode[]) => void;
}