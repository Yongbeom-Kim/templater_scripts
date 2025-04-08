import { ParseTreeNode } from "../../parser/parse_types";
import { ClozifyVisitor, ClozeTransformOptions } from "./cloze_types";

export const clozify = (
  tree: ParseTreeNode[],
  options: ClozeTransformOptions = {},
): ParseTreeNode[] => {
  const visitor = new ClozifyVisitor(options);
  tree.forEach((node) => node.visit(visitor));
  return visitor.transformedNodes;
};
