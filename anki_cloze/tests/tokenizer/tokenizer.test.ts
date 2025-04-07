import { describe, test, expect } from "@jest/globals";
import { tokenize } from "../../src/tokenizer/tokenizer";
import { TestCases as ListTestCases } from "../data/list.testcase";
import { TestCases as TextTestCases } from "../data/text.testcase";
import { TestCases as CodeBlockTestCases } from "../data/code_block.testcase";

describe("test text.testcase.ts", () => {
  it.each(TextTestCases)(
    'should tokenize "%p" correctly',
    ({ input, tokenize_expect }) => {
      const tokens = tokenize(input);
      tokenize_expect(tokens);
      expect(tokens).toMatchSnapshot();
    },
  );
});

describe("test list.testcase.ts", () => {
  it.each(ListTestCases)(
    'should tokenize "%p" correctly',
    ({ input, tokenize_expect }) => {
      const tokens = tokenize(input);
      tokenize_expect(tokens);
      expect(tokens).toMatchSnapshot();
    },
  );
});

describe("test code_block.testcase.ts", () => {
  it.each(CodeBlockTestCases)(
    'should tokenize "%p" correctly',
    ({ input, tokenize_expect }) => {
      const tokens = tokenize(input);
      tokenize_expect(tokens);
      expect(tokens).toMatchSnapshot();
    },
  );
});
