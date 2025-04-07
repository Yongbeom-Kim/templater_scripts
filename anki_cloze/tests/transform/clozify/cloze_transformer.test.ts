import { describe, test, expect } from "@jest/globals";
import { tokenize } from "../../../src/tokenizer/tokenizer";
import { TokenType } from "../../../src/tokenizer/token_types";
import { TestCases as ListTestCases } from "../../data/list.testcase";
import { TestCases as TextTestCases } from "../../data/text.testcase";
import { TestCases as CodeBlockTestCases } from "../../data/code_block.testcase";
import { clozify } from "../../../src/transform/clozify/cloze_transformer";
import { parse } from "../../../src/parser/parser";

describe("test text.testcase.ts", () => {
  it.each(TextTestCases)(
    'should tokenize "%p" correctly',
    ({ input, clozify_expect }) => {
      const tokens = tokenize(input);
      const parse_tree = parse(tokens);
      const result = clozify(parse_tree);
      clozify_expect(result);
      expect(result).toMatchSnapshot();
    },
  );
});

describe("test list.testcase.ts", () => {
  it.each(ListTestCases)(
    'should tokenize "%p" correctly',
    ({ input, clozify_expect }) => {
      const tokens = tokenize(input);
      const parse_tree = parse(tokens);
      const result = clozify(parse_tree);
      clozify_expect(result);
      expect(result).toMatchSnapshot();
    },
  );
});

describe("test code_block.testcase.ts", () => {
  it.each(CodeBlockTestCases)(
    'should tokenize "%p" correctly',
    ({ input, clozify_expect }) => {
      const tokens = tokenize(input);
      const parse_tree = parse(tokens);
      const result = clozify(parse_tree);
      clozify_expect(result);
      expect(result).toMatchSnapshot();
    },
  );
});

