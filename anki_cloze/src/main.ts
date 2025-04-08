import { parse } from "./parser/parser";
import { tokenize } from "./tokenizer/tokenizer";
import { clozify as clozifyParseTree } from "./transform/clozify/cloze_transformer";
import { ParseTreeNode } from "./parser/parse_types";
import { ClozeTransformOptions } from "./transform/clozify/cloze_types";
export function clozify(
  text: string,
  options: ClozeTransformOptions = {},
): string {
  const tokens = tokenize(text);
  const parseTree = parse(tokens);
  const clozes = clozifyParseTree(parseTree, options);
  return ParseTreeNode.toText(clozes);
}
