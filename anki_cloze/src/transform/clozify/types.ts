import { ListNode, ParseTreeNodeType } from "../../parser/parse_types";

import { ParseTreeNode } from "../../parser/parse_types";

import { ParseTreeVisitor } from "../../parser/parse_types";

class ClozifyVisitor extends ParseTreeVisitor {
  visit(node: ParseTreeNode): void {
    if (node instanceof ListNode) {
      node.visit(this);
    }
  }
}

// export class ClozeTextLineNode extends TextLineNode {
//   construtor(

//   )
// }