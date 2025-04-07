import { describe, test, expect } from "@jest/globals";
import { parse } from "../../src/parser/parser";
import { TestCases as ListTestCases } from "../data/list.testcase";
import { TestCases as TextTestCases } from "../data/text.testcase";
import { TestCases as CodeBlockTestCases } from "../data/code_block.testcase";
import { tokenize } from "../../src/tokenizer/tokenizer";
import { ParseTreeNode } from "../../src/parser/parse_types";
describe("test text.testcase.ts", () => {
  it.each(TextTestCases)(
    'should parse "%p" correctly',
    ({ input, parse_expect }) => {
      const tokens = tokenize(input);
      const parseTree = parse(tokens);
      parse_expect(parseTree);
      expect(ParseTreeNode.toText(parseTree)).toEqual(input);
      expect(parseTree).toMatchSnapshot();
    },
  );
});

describe("test list.testcase.ts", () => {
  it.each(ListTestCases)(
    'should parse "%p" correctly',
    ({ input, parse_expect }) => {
      const tokens = tokenize(input);
      const parseTree = parse(tokens);
      parse_expect(parseTree);
      expect(ParseTreeNode.toText(parseTree)).toEqual(input);
      expect(parseTree).toMatchSnapshot();
    },
  );
});

describe("test code_block.testcase.ts", () => {
  it.each(CodeBlockTestCases)(
    'should parse "%p" correctly',
    ({ input, parse_expect }) => {
      const tokens = tokenize(input);
      const parseTree = parse(tokens);
      parse_expect(parseTree);
      expect(ParseTreeNode.toText(parseTree)).toEqual(input);
      expect(parseTree).toMatchSnapshot();
    },
  );
});
