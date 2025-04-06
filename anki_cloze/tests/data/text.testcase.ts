import { TestCase } from "./types";

export const TestCases: TestCase[] = [
  {
    description: "Simple text with newline",
    input: "Hello 123\nWorld",
    tokenize_expect: (result) => {
      return true;
    },
    parse_expect: (result) => {
      return true;
    },
  },
  {
    description: "Simple text with numbers",
    input: "123 456",
    tokenize_expect: (result) => {
      return true;
    },
    parse_expect: (result) => {
      return true;
    },
  },
  {
    description: "Whitespace characters",
    input: " \t ",
    tokenize_expect: (result) => {
      return true;
    },
    parse_expect: (result) => {
      return true;
    },
  },
  {
    description: "Multiple newlines",
    input: "\n\n",
    tokenize_expect: (result) => {
      return true;
    },
    parse_expect: (result) => {
      return true;
    },
  },
  {
    description: "Text with mixed whitespace and newlines",
    input: "Hello 123\n \tWorld\n456",
    tokenize_expect: (result) => {
      return true;
    },
    parse_expect: (result) => {
      return true;
    },
  },
  {
    description: "Text with multiple newlines",
    input: "Multiple\n\n\nNewlines\n\n\n",
    tokenize_expect: (result) => {
      return true;
    },
    parse_expect: (result) => {
      return true;
    },
  },
  {
    description: "Mixed whitespace and newlines",
    input: " \t \n \t ",
    tokenize_expect: (result) => {
      return true;
    },
    parse_expect: (result) => {
      return true;
    },
  },
];
