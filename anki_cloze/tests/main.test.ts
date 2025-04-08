import { clozify } from "../src/main";
import { parseSpecFile } from "./data/testcase_parser";

describe("test spec", () => {
  describe.each([
    "text/lists.spec.txt",
    "code_blocks/languages.spec.txt",
    "code_blocks/indents.spec.txt",
    "code_blocks/curly_braces.spec.txt",
  ])("%s", (name) => {
    const testCases = parseSpecFile(`tests/data/${name}`);
    it.each(testCases)("$name", ({ input, expected, flags }) => {
      const output = clozify(input, flags);
      expect(output).toBe(expected);
    });
  });
});