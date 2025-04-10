import { clozify } from "../src/clozify";
import { parseSpecFile } from "./data/testcase_parser";

describe("test spec", () => {
  describe.each([
    "code_blocks/cloze_index.spec.txt",
    "code_blocks/curly_braces.spec.txt",
    "code_blocks/indents.spec.txt",
    "code_blocks/languages.spec.txt",
    "code_blocks/transformation_modes.spec.txt",
    "table/main.spec.txt",
    "table/empty.spec.txt",
    "text/curly_braces.spec.txt",
    "text/lists.spec.txt",
  ])("%s", (name) => {
    const testCases = parseSpecFile(`tests/data/${name}`);
    it.each(testCases)("$name", ({ input, expected, flags }) => {
      const output = clozify(input, flags);
      expect(output).toBe(expected);
    });
  });
});
