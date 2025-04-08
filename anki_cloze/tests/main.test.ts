import { clozify } from "../src/main";
import { parseSpecFile } from "./data/testcase_parser";

describe("test spec", () => {
  describe("code_blocks", () => {
    describe("languages.spec.txt", () => {
      const testCases = parseSpecFile(
        "tests/data/code_blocks/languages.spec.txt",
      );
      it.each(testCases)("$name", ({ input, expected, flags }) => {
        const output = clozify(input, flags);
        expect(output).toBe(expected);
      });
    });
  });

  describe("text", () => {
    describe("lists.spec.txt", () => {
      const testCases = parseSpecFile("tests/data/text/lists.spec.txt");
      it.each(testCases)("$name", ({ input, expected, flags }) => {
        const output = clozify(input, flags);
        expect(output).toBe(expected);
      });
    });
  });
});
