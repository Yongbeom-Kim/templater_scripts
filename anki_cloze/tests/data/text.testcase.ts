import { TestCase } from "./types";

export const TestCases: TestCase[] = [
  {
    description: "Simple text with newline",
    input: "Hello 123\nWorld",
    tokenize_expect: () => true,
    parse_expect: () => true,
    clozify_expect: () => true,
    main_expect: (output: string) => {
      expect(output).toEqual("Hello 123\nWorld");
    },
  },
  {
    description: "Simple text with numbers",
    input: "123 456",
    tokenize_expect: () => true,
    parse_expect: () => true,
    clozify_expect: () => true,
    main_expect: (output: string) => {
      expect(output).toEqual("123 456");
    },
  },
  {
    description: "Whitespace characters",
    input: " \t ",
    tokenize_expect: () => true,
    parse_expect: () => true,
    clozify_expect: () => true,
    main_expect: (output: string) => {
      expect(output).toEqual(" \t ");
    },
  },
  {
    description: "Multiple newlines",
    input: "\n\n",
    tokenize_expect: () => true,
    parse_expect: () => true,
    clozify_expect: () => true,
    main_expect: (output: string) => {
      expect(output).toEqual("\n\n");
    },
  },
  {
    description: "Text with mixed whitespace and newlines",
    input: "Hello 123\n \tWorld\n456",
    tokenize_expect: () => true,
    parse_expect: () => true,
    clozify_expect: () => true,
    main_expect: (output: string) => {
      expect(output).toEqual("Hello 123\n \tWorld\n456");
    },
  },
  {
    description: "Text with multiple newlines",
    input: "Multiple\n\n\nNewlines\n\n\n",
    tokenize_expect: () => true,
    parse_expect: () => true,
    clozify_expect: () => true,
    main_expect: (output: string) => {
      expect(output).toEqual("Multiple\n\n\nNewlines\n\n\n");
    },
  },
  {
    description: "Mixed whitespace and newlines",
    input: " \t \n \t ",
    tokenize_expect: () => true,
    parse_expect: () => true,
    clozify_expect: () => true,
    main_expect: (output: string) => {
      expect(output).toEqual(" \t \n \t ");
    },
  },
];
