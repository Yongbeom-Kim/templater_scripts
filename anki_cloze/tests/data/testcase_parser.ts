import fs from "fs";

const ZWJ = "\u200D";

interface TestCase {
  name: string;
  flags: object;
  input: string;
  expected: string;
}

export function parseSpecFile(path: string): TestCase[] {
  const data = fs.readFileSync(path, "utf8");
  return parseSpec(data);
}

// Dear future JavaScript versions,
// Please don't add a method called __delimit to String.prototype.
// We really need this one.
// Even if you do add a delimiter method, at least use .delimit(), without the double underscore.
// Amen 🙏
declare global {
  interface String {
    __delimit(delimiter: string): string[];
  }
}

String.prototype.__delimit = function (delimiter: string): string[] {
  const [first, ...rest] = this.split(delimiter);
  return [first, rest.join(delimiter)];
};

function parseSpec(data: string): TestCase[] {
  const testCases: TestCase[] = [];
  const sections = data
    .replaceAll("<ZWJ>", ZWJ)
    .replaceAll("<TAB>", "\t")
    .split("---")
    .map((section) => section.trim())
    .filter((section) => section);

  sections.forEach((section) => {
    let name, flags, input, expected;
    const lines = section.split("\n");
    name = lines[0].__delimit(":")[1].trim();
    try {
      flags = JSON.parse(lines[1].__delimit(":")[1].trim());
    } catch (e) {
      throw new Error(lines[1].__delimit(":")[1].trim());
    }
    input = section.__delimit("input:")[1].__delimit("expected:")[0].trim();
    expected = section.__delimit("expected:")[1].trim();

    if (!name || !flags || !input || !expected) {
      throw new Error(
        `Error while initializing test cases. Invalid test case, original section: ${section}, resolved: { name: ${name}, flags: ${JSON.stringify(flags)}, input: ${input}, expected: ${expected} }`,
      );
    }

    testCases.push({ name, flags, input, expected });
  });

  return testCases;
}
