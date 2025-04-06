import { describe, test, expect } from "@jest/globals";
import { parse } from "../../src/parser/main";
import { TestCases as ListTestCases } from "../data/list.testcase";
import { TestCases as TextTestCases } from "../data/text.testcase";
import { tokenize } from "../../src/tokenizer/main";

describe('test text.testcase.ts', () => {
  it.each(TextTestCases)('should parse "%p" correctly', ({input, parse_expect}) => {
    const tokens = tokenize(input);
    const parseTree = parse(tokens);
    parse_expect(parseTree);
    expect(parseTree).toMatchSnapshot();
  });
});

describe('test list.testcase.ts', () => {
  it.each(ListTestCases)('should parse "%p" correctly', ({input, parse_expect}) => {
    const tokens = tokenize(input);
    const parseTree = parse(tokens);
    parse_expect(parseTree);
    expect(parseTree).toMatchSnapshot();
  });
});