import { ParseTreeNode } from "../../parser/parse_types";
import { ClozifyVisitor } from "./cloze_types";

export const clozify = (tree: ParseTreeNode[]): ParseTreeNode[] => {
  const visitor = new ClozifyVisitor();
  tree.forEach((node) => node.visit(visitor));
  return visitor.transformedNodes;
};
