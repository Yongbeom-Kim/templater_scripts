import { parse } from "./parser/parser";
import { tokenize } from "./tokenizer/tokenizer";
import { clozify as clozifyParseTree } from "./transform/clozify/cloze_transformer";
import { ParseTreeNode } from "./parser/parse_types";
import { ClozeTransformOptions } from "./transform/clozify/cloze_types";
import { mergeObject } from "./utils/merge_object";

const default_options: ClozeTransformOptions = {
  handle_curly: "fullwidth",
  list: {
    enable_hints: false,
  },
};

export function clozify(
  text: string,
  options: Partial<ClozeTransformOptions> = {},
): string {
  const tokens = tokenize(text);
  const parseTree = parse(tokens);
  const completeOptions = mergeObject(default_options, options);
  const clozes = clozifyParseTree(parseTree, completeOptions);
  return clozes.map((c) => c.toClozeText(completeOptions, false)).join("");
}
