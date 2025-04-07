import { clozify } from "../src/main";
import { tokenize } from "../src/tokenizer/tokenizer";
import { TestCases as TextTestCases } from "./data/text.testcase";
import { TestCases as ListTestCases } from "./data/list.testcase";
import { parseSpecFile } from "./data/parser";
describe("test text.testcase.ts", () => {
  it.each(TextTestCases)(
    'should tokenize "%p" correctly',
    ({ input, main_expect }) => {
      const output = clozify(input);
      main_expect(output);
    },
  );
});

describe("test list.testcase.ts", () => {
  it.each(ListTestCases)(
    'should tokenize "%p" correctly',
    ({ input, main_expect }) => {
      const output = clozify(input);
      main_expect(output);
    },
  );
});

describe('test spec', () => {
  describe('code_blocks', () => {
    describe('languages.spec.txt', () => {
      const testCases = parseSpecFile('tests/data/code_blocks/languages.spec.txt');
      it.each(testCases)('$name', ({ input, expected }) => {
        const output = clozify(input);
        console.log(input);
        expect(output).toBe(expected);
      });
    })
  })
})