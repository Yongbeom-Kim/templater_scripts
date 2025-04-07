import fs from 'fs';

interface TestCase {
    name: string;
    flags: object;
    input: string;
    expected: string;
}

export function parseSpecFile(path: string): TestCase[] {
  const data = fs.readFileSync(path, 'utf8');
  return parseSpec(data);
}

function parseSpec(data: string): TestCase[] {
    const testCases: TestCase[] = [];
    const sections = data.split('---').map(section => section.trim()).filter(section => section);

    sections.forEach(section => {
      let name, flags, input, expected;
      const lines = section.split('\n');
      name = lines[0].split(':')[1].trim();
      flags = JSON.parse(lines[1].split(':')[1].trim());
      input = section.split('input:')[1].split('expected:')[0].trim();
      expected = section.split('expected:')[1].trim();

      if (!name || !flags || !input || !expected) {
        throw new Error(`Error while initializing test cases. Invalid test case, original section: ${section}, resolved: { name: ${name}, flags: ${JSON.stringify(flags)}, input: ${input}, expected: ${expected} }`);
      }

      testCases.push({ name, flags, input, expected });
    });

    return testCases;
}