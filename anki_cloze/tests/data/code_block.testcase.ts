import {
  CodeBlockLanguage,
  CodeBlockNode,
  CodeLineNode,
  ParseTreeNode,
  ParseTreeNodeType,
} from "../../src/parser/parse_types";
import { Token } from "../../src/tokenizer/token_types";
import {
  ClozeCodeLineNode,
  ClozeTextNode,
} from "../../src/transform/clozify/cloze_types";
import { TestCase } from "./types";

const TRIPLE_QUOTE = "```";
export const TestCases: TestCase[] = [
  {
    description: "Basic python code block, no clozes",
    input: `
${TRIPLE_QUOTE}python
def x():
  print("Hello, world!")
  # Comment
${TRIPLE_QUOTE}
    `.trim(),
    tokenize_expect: () => {},
    parse_expect: (result: ParseTreeNode[]) => {
      expect(result.length).toBe(1);
      expect(result[0].type).toBe(ParseTreeNodeType.CodeBlock);
      expect((result[0] as CodeBlockNode).language).toBe(
        CodeBlockLanguage.Python,
      );
      expect((result[0] as CodeBlockNode).contents.length).toBe(3);
      expect((result[0] as CodeBlockNode).contents[0].type).toBe(
        ParseTreeNodeType.CodeLine,
      );
      expect((result[0] as CodeBlockNode).contents[1].type).toBe(
        ParseTreeNodeType.CodeLine,
      );
      expect((result[0] as CodeBlockNode).contents[2].type).toBe(
        ParseTreeNodeType.CodeComment,
      );
    },
    clozify_expect: (result: ParseTreeNode[]) => {
      expect(result.length).toBe(1);
      expect(result[0].type).toBe(ParseTreeNodeType.CodeBlock);
      expect((result[0] as CodeBlockNode).language).toBe(
        CodeBlockLanguage.Python,
      );
      expect((result[0] as CodeBlockNode).contents.length).toBe(3);
      expect((result[0] as CodeBlockNode).contents[0].type).toBe(
        ParseTreeNodeType.CodeLine,
      );
      expect((result[0] as CodeBlockNode).contents[1].type).toBe(
        ParseTreeNodeType.CodeLine,
      );
      expect((result[0] as CodeBlockNode).contents[2].type).toBe(
        ParseTreeNodeType.CodeComment,
      );
    },
    main_expect: (result: string) => {
      expect(result).toBe(
        `
${TRIPLE_QUOTE}python
def x():
  print("Hello, world!")
  # Comment
${TRIPLE_QUOTE}
    `.trim(),
      );
    },
  },

  {
    description: "Basic C++ code block with clozes (4-space indent)",
    input: `
${TRIPLE_QUOTE}cpp
/* multi-line comment */
#include <iostream>

int main() {
    // This is a simple C++ program
    std::cout << "Hello, world!" << std::endl;
    return 0;
  
}
${TRIPLE_QUOTE}
    `.trim(),
    tokenize_expect: () => {},
    parse_expect: (result: ParseTreeNode[]) => {
      expect(result.length).toBe(1);
      expect(result[0].type).toBe(ParseTreeNodeType.CodeBlock);
      expect((result[0] as CodeBlockNode).language).toBe(CodeBlockLanguage.Cpp);
      expect((result[0] as CodeBlockNode).contents.length).toBe(9);
      for (const i of [0, 4]) {
        const node = (result[0] as CodeBlockNode).contents[i];
        expect(node.type).toBe(ParseTreeNodeType.CodeComment);
      }
      for (const i of [1, 2, 3, 5, 6, 7, 8]) {
        const node = (result[0] as CodeBlockNode).contents[i];
        expect(node.type).toBe(ParseTreeNodeType.CodeLine);
      }
    },
    clozify_expect: (result: ParseTreeNode[]) => {
      // same as parse_expect
      expect(result.length).toBe(1);
      expect(result[0].type).toBe(ParseTreeNodeType.CodeBlock);
      expect((result[0] as CodeBlockNode).language).toBe(CodeBlockLanguage.Cpp);
      expect((result[0] as CodeBlockNode).contents.length).toBe(9);
      for (const i of [0, 4]) {
        const node = (result[0] as CodeBlockNode).contents[i];
        expect(node.type).toBe(ParseTreeNodeType.CodeComment);
      }
      for (const i of [1, 2, 3, 5, 6, 7, 8]) {
        const node = (result[0] as CodeBlockNode).contents[i];
        expect(node.type).toBe(ParseTreeNodeType.CodeLine);
      }
      // Verify cloze deletions are added
      for (const i of [1, 5, 6]) {
        const node = (result[0] as CodeBlockNode).contents[i];
        expect(node).toBeInstanceOf(ClozeCodeLineNode);
      }
    },
    main_expect: (result: string) => {
      expect(result).toBe(
        `
${TRIPLE_QUOTE}cpp
/* multi-line comment */
{{c1::#include <iostream>}}

int main() {
\t// This is a simple C++ program
\t{{c2::std::cout << "Hello, world!" << std::endl;}}
\t{{c2::return 0;}}
  
}
${TRIPLE_QUOTE}
      `.trim(),
      );
    },
  },
];
