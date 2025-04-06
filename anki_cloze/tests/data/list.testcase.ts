import { ListNode, ParseTreeNode } from "../../src/parser/parse_types";
import { ClozeTextNode } from "../../src/transform/clozify/cloze_types";
import { TestCase } from "./types";

export const TestCases: TestCase[] = [
  {
    description: "Parse nested list of items",
    input: `- Front - Back
  - Front = Back
1. Front - Back
  1. Front = Back
  2. Front = Back`,
    tokenize_expect: (result) => {
      return true;
    },
    parse_expect: (result: ParseTreeNode[]) => {
      expect(result.length).toBe(5);
      expect(result[0]).toBeInstanceOf(ListNode);
      expect((result[0] as ListNode).ordered).toBe(false);
      expect(result[1]).toBeInstanceOf(ListNode);
      expect((result[1] as ListNode).ordered).toBe(false);
      expect(result[2]).toBeInstanceOf(ListNode);
      expect((result[2] as ListNode).ordered).toBe(true);
      expect(result[3]).toBeInstanceOf(ListNode);
      expect((result[3] as ListNode).ordered).toBe(true);
      expect(result[4]).toBeInstanceOf(ListNode);
      expect((result[4] as ListNode).ordered).toBe(true);
    },
    clozify_expect: (result: ParseTreeNode[]) => {
      // Same as parse_expect
      expect(result.length).toBe(5);
      expect(result[0]).toBeInstanceOf(ListNode);
      expect((result[0] as ListNode).ordered).toBe(false);
      expect(result[1]).toBeInstanceOf(ListNode);
      expect((result[1] as ListNode).ordered).toBe(false);
      expect(result[2]).toBeInstanceOf(ListNode);
      expect((result[2] as ListNode).ordered).toBe(true);
      expect(result[3]).toBeInstanceOf(ListNode);
      expect((result[3] as ListNode).ordered).toBe(true);
      expect(result[4]).toBeInstanceOf(ListNode);
      expect((result[4] as ListNode).ordered).toBe(true);

      // Verify cloze deletions are added
      for (const node of result) {
        expect((node as ListNode).contents.length).toBe(3);
        expect((node as ListNode).contents[0]).toBeInstanceOf(ClozeTextNode);
        expect(((node as ListNode).contents[0] as ClozeTextNode).front).toBe(
          true,
        );
        expect((node as ListNode).contents[1]).not.toBeInstanceOf(
          ClozeTextNode,
        );
        expect((node as ListNode).contents[2]).toBeInstanceOf(ClozeTextNode);
        expect(((node as ListNode).contents[2] as ClozeTextNode).front).toBe(
          false,
        );
      }
    },
    main_expect: (result: string) => {
      expect(result).toBe(
        `- {{c1::::Front}} - {{c1::Back}}
  - {{c2::::Front}} = {{c2::Back}}
1. {{c3::::Front}} - {{c3::Back}}
  1. {{c4::::Front}} = {{c4::Back}}
  2. {{c5::::Front}} = {{c5::Back}}`,
      );
    },
  },
];
