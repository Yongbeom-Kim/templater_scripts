import {
  ListNode,
  ParseTreeNodeType,
  CodeBlockNode,
  TextLineNode,
  TextNode,
  CodeLineNode,
  IndentNode,
  CodeBlockLanguage,
  TableHeaderNode,
  TableRowNode,
  TableCellNode,
  TableAlignment,
} from "../parser/parse_types";

import { ParseTreeNode } from "../parser/parse_types";

import { ParseTreeVisitor } from "../parser/parse_types";
import { Token, TokenType } from "../tokenizer/token_types";
import { mergeObject } from "../utils/merge_object";

const ZWJ = "\u200D";
const FullRightCurlyBrace = "｝";

const CLOZE_DELETION_LENGTH = 11; // {{c1000::}}, surely no one will have more than 9999 clozes in a table cell

export type ClozeTransformOptions = {
  handle_curly: "fullwidth" | "zwj" | "insert_space";
  list: {
    enable_hints: boolean;
  };
  code: {
    transform_mode:
      | "markdown_block"
      | "markdown_inline"
      | "html_block"
      | "html_inline";
  };
};

export type ClozeDeletionType = {
  is_deletion: boolean;
  is_hint: boolean;
  cloze_index: number;
};

const cloze_delete = (
  str: string,
  type: ClozeDeletionType,
  options: ClozeTransformOptions,
) => {
  if (!type.is_deletion && !type.is_hint) {
    return str;
  }
  if (options.handle_curly === "zwj") {
    str = str
      .replaceAll("}}", "}" + ZWJ + "}")
      .replaceAll("}}", "}" + ZWJ + "}") // 2x replaceAll inserts delimiter between all pairs
      .replace(/}$/, "}" + ZWJ);
  } else if (options.handle_curly === "fullwidth") {
    str = str
      .replaceAll("}", FullRightCurlyBrace)
      .replace(/}$/, FullRightCurlyBrace);
  } else if (options.handle_curly === "insert_space") {
    str = str
      .replaceAll("}}", "} }")
      .replaceAll("}}", "} }") // 2x replaceAll inserts delimiter between all pairs
      .replace(/}$/, "} ");
  }
  if (type.is_deletion) {
    return `{{c${type.cloze_index}::${str}}}`;
  }

  return `{{c${type.cloze_index}::::${str}}}`;
};

// Types
export interface ClozeNode {
  toClozeText(options: ClozeTransformOptions, disable_cloze: boolean): string;
}

export abstract class ClozeParseTreeNode
  extends ParseTreeNode
  implements ClozeNode
{
  constructor(public readonly cloze_type: ClozeDeletionType) {
    if (cloze_type.is_deletion && cloze_type.is_hint) {
      throw new Error(
        "A node cannot be both a cloze deletion and a cloze hint.",
      );
    }
    super();
  }

  visit(visitor: ParseTreeVisitor) {
    visitor.visit(this);
  }

  abstract toClozeText(
    options: ClozeTransformOptions,
    disable_cloze: boolean,
  ): string;
}

export class ClozeIndentNode extends ClozeParseTreeNode {
  type: ParseTreeNodeType = ParseTreeNodeType.Indent;

  constructor(
    public readonly n_spaces: number,
    public readonly n_tabs: number,
    public readonly spaces_per_tab: 2 | 4,
  ) {
    super({ is_deletion: false, is_hint: false, cloze_index: -1 }); // Indent cannot be a cloze deletion.
  }
  toClozeText(options: ClozeTransformOptions, disable_cloze: boolean): string {
    const final_tabs =
      Math.round(this.n_spaces / this.spaces_per_tab) + this.n_tabs;
    return "\t".repeat(final_tabs);
  }
  toText(): string {
    return "\t".repeat(this.n_tabs) + " ".repeat(this.n_spaces);
  }
  clone(): ParseTreeNode {
    throw new Error("Method not implemented.");
  }
}

export class ClozeTextNode extends ClozeParseTreeNode {
  type: ParseTreeNodeType = ParseTreeNodeType.Text;
  constructor(
    public readonly cloze_type: ClozeDeletionType,
    public readonly contents: Token[],
  ) {
    super(cloze_type);
  }
  toClozeText(options: ClozeTransformOptions, disable_cloze: boolean): string {
    if (disable_cloze) {
      return this.toText();
    }
    return cloze_delete(this.toText(), this.cloze_type, options);
  }
  toText(): string {
    return this.contents.map((t) => t.lexeme).join("");
  }
}

export class ClozeTextLineNode extends ClozeParseTreeNode {
  type = ParseTreeNodeType.Text;

  constructor(
    public readonly cloze_type: ClozeDeletionType,
    public readonly indent: ClozeIndentNode,
    public readonly contents: ClozeParseTreeNode[],
    public readonly endingNewline?: Token, // undefined if EOF
  ) {
    super(cloze_type);
  }

  toClozeText(options: ClozeTransformOptions, disable_cloze: boolean): string {
    return (
      this.indent.toClozeText(options, disable_cloze) +
      this.contents.map((t) => t.toClozeText(options, disable_cloze)).join("") +
      (this.endingNewline?.lexeme ?? "")
    );
  }
  toText(): string {
    return (
      this.indent.toText() +
      this.contents.map((t) => t.toText()).join("") +
      (this.endingNewline?.lexeme ?? "")
    );
  }
}

export class ClozeListNode extends ClozeParseTreeNode {
  type = ParseTreeNodeType.List;

  constructor(
    public readonly ordered: boolean,
    public readonly indent: ClozeIndentNode,
    public readonly marker: Token[],
    public readonly contents: ClozeParseTreeNode[],
    public readonly endingNewline?: Token, // undefined if EOF
  ) {
    super({ is_deletion: false, is_hint: false, cloze_index: -1 });
  }

  toText(): string {
    return (
      this.indent.toText() +
      this.marker.map((t) => t.lexeme).join("") +
      " " +
      this.contents.map((t) => t.toText()).join("") +
      (this.endingNewline?.lexeme ?? "")
    );
  }

  toClozeText(options: ClozeTransformOptions, disable_cloze: boolean): string {
    return (
      this.indent.toClozeText(options, disable_cloze) +
      this.marker.map((t) => t.lexeme).join("") +
      " " +
      this.contents.map((t) => t.toClozeText(options, disable_cloze)).join("") +
      (this.endingNewline?.lexeme ?? "")
    );
  }
}

export class ClozeTableNode extends ClozeParseTreeNode {
  type = ParseTreeNodeType.Table;

  constructor(
    public readonly headers: ClozeTableHeaderNode,
    public readonly rows: ClozeTableRowNode[],
    public readonly endingNewline?: Token, // undefined if EOF
  ) {
    super({ is_deletion: false, is_hint: false, cloze_index: -1 });
  }

  toText(): string {
    return (
      this.headers.toText() +
      "\n" +
      this.rows.map((r) => r.toText()).join("") +
      (this.endingNewline?.lexeme ?? "")
    );
  }
  toClozeText(options: ClozeTransformOptions, disable_cloze: boolean): string {
    return (
      this.headers.toClozeText(options, disable_cloze) +
      "\n" +
      this.rows.map((r) => r.toClozeText(options, disable_cloze)).join("") +
      (this.endingNewline?.lexeme ?? "")
    );
  }
}

export class ClozeTableHeaderNode extends ClozeParseTreeNode {
  type = ParseTreeNodeType.TableHeader;
  constructor(public readonly contents: ClozeTableCellNode[]) {
    super({ is_deletion: false, is_hint: false, cloze_index: -1 });
  }
  toText(): string {
    const header =
      "| " + this.contents.map((c) => c.toText()).join(" | ") + " |";
    const separator =
      "|" +
      this.contents
        .map((c) => {
          switch (c.alignment) {
            case "left":
              return ":" + "-".repeat(c.colWidth - 1);
            case "center":
              return ":" + "-".repeat(c.colWidth - 2) + ":";
            case "right":
              return "-".repeat(c.colWidth - 1) + ":";
            default:
              return "-".repeat(c.colWidth);
          }
        })
        .join("|") +
      "|";
    return header + "\n" + separator;
  }
  toClozeText(options: ClozeTransformOptions, disable_cloze: boolean): string {
    const header =
      "| " +
      this.contents
        .map((c) => c.toClozeText(options, disable_cloze))
        .join(" | ") +
      " |";
    const separator =
      "|" +
      this.contents
        .map((c) => {
          switch (c.alignment) {
            case "left":
              return ":" + "-".repeat(c.colWidth + CLOZE_DELETION_LENGTH) + " ";
            case "center":
              return ":" + "-".repeat(c.colWidth + CLOZE_DELETION_LENGTH) + ":";
            case "right":
              return " " + "-".repeat(c.colWidth + CLOZE_DELETION_LENGTH) + ":";
            default:
              return " " + "-".repeat(c.colWidth + CLOZE_DELETION_LENGTH) + " ";
          }
        })
        .join("|") +
      "|";
    return header + "\n" + separator;
  }
}

export class ClozeTableRowNode extends ClozeParseTreeNode {
  type = ParseTreeNodeType.TableRow;

  constructor(
    public readonly contents: ClozeTableCellNode[],
    public readonly endingNewline?: Token, // undefined if EOF
  ) {
    super({ is_deletion: false, is_hint: false, cloze_index: -1 });
  }
  toText(): string {
    return (
      "|" +
      this.contents.map((c) => c.toText()).join("|") +
      "|" +
      (this.endingNewline?.lexeme ?? "")
    );
  }

  toClozeText(options: ClozeTransformOptions, disable_cloze: boolean): string {
    return (
      "| " +
      this.contents
        .map((c) => c.toClozeText(options, disable_cloze))
        .join(" | ") +
      " |" +
      (this.endingNewline?.lexeme ?? "")
    );
  }
}

export class ClozeTableCellNode extends ClozeParseTreeNode {
  type = ParseTreeNodeType.TableCell;
  constructor(
    public readonly cloze_type: ClozeDeletionType,
    public readonly contents: Token[],
    public readonly alignment: TableAlignment,
    public readonly colWidth: number, // number of characters between " | " separators (including spaces)
  ) {
    super(cloze_type);
  }
  toText(): string {
    const contentText = this.contents.map((c) => c.lexeme).join("");
    const padding = this.colWidth - contentText.length;
    let paddedText;

    switch (this.alignment) {
      case "left":
      case "none":
        paddedText = contentText + " ".repeat(padding);
        break;
      case "center":
        const leftPadding = Math.floor(padding / 2);
        const rightPadding = padding - leftPadding;
        paddedText =
          " ".repeat(leftPadding) + contentText + " ".repeat(rightPadding);
        break;
      case "right":
        paddedText = " ".repeat(padding) + contentText;
        break;
    }

    return paddedText;
  }

  toClozeText(options: ClozeTransformOptions, disable_cloze: boolean): string {
    let contentText = this.contents.map((c) => c.lexeme).join("");
    if (!disable_cloze) {
      contentText = cloze_delete(contentText, this.cloze_type, options);
    }
    const padding = this.colWidth + CLOZE_DELETION_LENGTH - contentText.length;
    let paddedText;

    switch (this.alignment) {
      case "left":
      case "none":
        paddedText = contentText + " ".repeat(padding);
        break;
      case "center":
        const leftPadding = Math.floor(padding / 2);
        const rightPadding = padding - leftPadding;
        paddedText =
          " ".repeat(leftPadding) + contentText + " ".repeat(rightPadding);
        break;
      case "right":
        paddedText = " ".repeat(padding) + contentText;
        break;
    }

    return paddedText;
  }
}

export class ClozeCodeBlockNode extends ClozeParseTreeNode {
  type: ParseTreeNodeType = ParseTreeNodeType.CodeBlock;
  constructor(
    public readonly language_str: string,
    public readonly language: CodeBlockLanguage,
    public readonly contents: ClozeCodeLineNode[],
    public readonly spacesPerTab: 2 | 4,
    public readonly endingNewline?: Token, // undefined if EOF
  ) {
    super({ is_deletion: false, is_hint: false, cloze_index: -1 });
  }
  toText(): string {
    return `\`\`\`${this.language_str}\n${this.contents
      .map((t) => t.toText())
      .join("")}\`\`\`${this.endingNewline?.lexeme ?? ""}`;
  }
  toClozeText(options: ClozeTransformOptions, disable_cloze: boolean): string {
    let content = this.contents
      .map((t) => t.toClozeText(options, disable_cloze))
      .join("");

    /*
    If the code block is being transformed to HTML inline or markdown inline,
    we need to remove ONE trailing newline from the content.

    This is because if we think about the original code
    ```lang
    code_line
    ```

    This must become
    `code_line`

    The code_line will be parsed with a trailing newline.
    Since we are converting this to some inline content
    we need to remove the trailing newline so that it displays correctly.

    This is NOT the case for elements in the middle of the code block,
    since they will be parsed with the trailing newline correctly.

    For example,
    ```lang
    code_line
    code_line
    ```

    must become
    `code_line`
    `code_line`

    so the trailing newline of the first code_line must be included,
    but the trailing newline of the second code_line must not be included.
    */
    if (
      options.code.transform_mode === "html_inline" ||
      options.code.transform_mode === "markdown_inline"
    ) {
      content = content.replace(/\n$/, "");
    }

    switch (options.code.transform_mode) {
      case "html_block":
        return `<pre style="white-space: pre-wrap; overflow-wrap: normal;">\n<code class="language-${
          this.language
        }">\n${content}</code>\n</pre>${this.endingNewline?.lexeme ?? ""}`;
      case "markdown_block":
        return `\`\`\`${this.language_str}\n${content}\`\`\`${this.endingNewline?.lexeme ?? ""}`;
      case "html_inline": // Handled by ClozeCodeLineNode.toClozeText()
      case "markdown_inline":
        return `${content}${this.endingNewline?.lexeme ?? ""}`;
    }
  }
}

export class ClozeCodeLineNode extends ClozeParseTreeNode {
  type = ParseTreeNodeType.CodeLine;
  constructor(
    public readonly language: CodeBlockLanguage,
    public readonly cloze_type: ClozeDeletionType,
    public readonly indent: ClozeIndentNode,
    public readonly contents: ClozeParseTreeNode[],
    public readonly endingNewline?: Token, // undefined if EOF
  ) {
    if (cloze_type.is_hint) {
      throw new Error("Cloze hint on code line is not supported.");
    }
    super(cloze_type);
  }

  toClozeText(options: ClozeTransformOptions, disable_cloze: boolean): string {
    const indent = this.indent.toClozeText(options, disable_cloze);
    let content = this.contents
      .map((t) => t.toClozeText(options, true))
      .join("");
    if (this.cloze_type.is_deletion) {
      content = cloze_delete(content, this.cloze_type, options);
    }
    switch (options.code.transform_mode) {
      case "html_inline":
        content = content.replace(/\n$/, "");
        return `<pre style="white-space: pre-wrap; overflow-wrap: normal;"><code class="language-${this.language}">${content}</code></pre>${this.endingNewline?.lexeme ?? ""}`;
      case "markdown_inline":
        content = content.replace(/\n$/, "");
        return `\`${content}\`${this.endingNewline?.lexeme ?? ""}`;
      case "html_block":
      case "markdown_block":
        return `${indent}${content}${this.endingNewline?.lexeme ?? ""}`;
    }
  }

  toText(): string {
    return this.contents.map((t) => t.toText()).join("");
  }
}

export class ClozeCodeCommentNode extends ClozeCodeLineNode {
  type = ParseTreeNodeType.CodeComment;
  toClozeText(options: ClozeTransformOptions, disable_cloze: boolean): string {
    if (disable_cloze) {
      console.warn(
        "Cloze deletions on code comments are not supported. This will be ignored.",
      );
    }
    return super.toClozeText(options, disable_cloze);
  }
  toText(): string {
    return this.contents.map((t) => t.toText()).join("");
  }
}
