import {
  ListNode,
  ParseTreeNodeType,
  CodeBlockNode,
  TextLineNode,
  TextNode,
  CodeLineNode,
  IndentNode,
  CodeBlockLanguage,
} from "../../parser/parse_types";

import { ParseTreeNode } from "../../parser/parse_types";

import { ParseTreeVisitor } from "../../parser/parse_types";
import { Token, TokenType } from "../../tokenizer/token_types";
import { mergeObject } from "../../utils/merge_object";

const ZWJ = "\u200D";
const FullRightCurlyBrace = "｝";

export type ClozeTransformOptions = {
  front: boolean;
  code: {
    handle_curly: "fullwidth" | "zwj" | "insert_space";
  };
};

export type ClozeDeletionType = {
  is_deletion: boolean;
  is_hint: boolean;
  cloze_index: number;
};

const cloze_delete = (str: string, type: ClozeDeletionType) => {
  if (!type.is_deletion && !type.is_hint) {
    return str;
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
        "A node cannot be both a cloze deletion and a cloze hint."
      );
    }
    super();
  }

  visit(visitor: ParseTreeVisitor) {
    visitor.visit(this);
  }

  abstract toClozeText(
    options: ClozeTransformOptions,
    disable_cloze: boolean
  ): string;
}

export class ClozeIndentNode extends ClozeParseTreeNode {
  type: ParseTreeNodeType = ParseTreeNodeType.Indent;

  constructor(
    public readonly n_spaces: number,
    public readonly n_tabs: number,
    public readonly spaces_per_tab: 2 | 4
  ) {
    super({ is_deletion: false, is_hint: false, cloze_index: -1 }); // Indent cannot be a cloze deletion.
  }
  toClozeText(options: ClozeTransformOptions, disable_cloze: boolean): string {
    const final_tabs =
      Math.round(this.n_spaces / this.spaces_per_tab) + this.n_tabs;
    return (
      "\t".repeat(final_tabs)
    );
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
    public readonly contents: Token[]
  ) {
    super(cloze_type);
  }
  toClozeText(options: ClozeTransformOptions, disable_cloze: boolean): string {
    if (disable_cloze) {
      return this.toText();
    }
    return cloze_delete(this.toText(), this.cloze_type);
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
    public readonly endingNewline?: Token // undefined if EOF
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
    public readonly endingNewline?: Token // undefined if EOF
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

export class ClozeCodeBlockNode extends ClozeParseTreeNode {
  type: ParseTreeNodeType = ParseTreeNodeType.CodeBlock;
  constructor(
    public readonly language_str: string,
    public readonly language: CodeBlockLanguage,
    public readonly contents: ClozeCodeLineNode[],
    public readonly spacesPerTab: 2 | 4
  ) {
    super({ is_deletion: false, is_hint: false, cloze_index: -1 });
  }
  toText(): string {
    return `\`\`\`${this.language_str}\n${this.contents
      .map((t) => t.toText())
      .join("")}\`\`\``;
  }
  toClozeText(options: ClozeTransformOptions, disable_cloze: boolean): string {
    return `<pre style="white-space: pre-wrap; overflow-wrap: normal;">\n<code class="language-${
      this.language
    }">\n${this.contents
      .map((t) => t.toClozeText(options, disable_cloze))
      .join("")}</code>\n</pre>`;
  }
}

export class ClozeCodeLineNode extends ClozeParseTreeNode {
  type = ParseTreeNodeType.CodeLine;
  constructor(
    public readonly cloze_type: ClozeDeletionType,
    public readonly indent: ClozeIndentNode,
    public readonly contents: ClozeParseTreeNode[],
    public readonly endingNewline?: Token // undefined if EOF
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
    if (options.code.handle_curly === "zwj") {
      content = content
        .replaceAll("}}", "}" + ZWJ + "}")
        .replaceAll("}}", "}" + ZWJ + "}") // 2x replaceAll inserts delimiter between all pairs
        .replace(/}$/, "}" + ZWJ);
    } else if (options.code.handle_curly === "fullwidth") {
      content = content
        .replaceAll("}", FullRightCurlyBrace)
        .replace(/}$/, FullRightCurlyBrace);
    } else if (options.code.handle_curly === "insert_space") {
      content = content
        .replaceAll("}}", "} }")
        .replaceAll("}}", "} }") // 2x replaceAll inserts delimiter between all pairs
        .replace(/}$/, "} ");
    }
    if (this.cloze_type.is_deletion) {
      content = `{{c${this.cloze_type.cloze_index}::${content}}}`;
    }
    return `${indent}${content}${this.endingNewline?.lexeme ?? ""}`;
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
        "Cloze deletions on code comments are not supported. This will be ignored."
      );
    }
    return super.toClozeText(options, disable_cloze);
  }
  toText(): string {
    return this.contents.map((t) => t.toText()).join("");
  }
}
