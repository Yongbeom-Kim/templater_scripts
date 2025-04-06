import { ListNode, ParseTreeNode } from "../../src/parser/types";
import { TestCase } from "./types";

export const TestCases: TestCase[] = [
  {
    description: "Parse nested list of items",
    input: 
`- Front - Back
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
  },
];
