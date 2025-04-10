# Transforming Lists to Cloze Deletions

Lists (bullet and numbered) are one way to generate cloze deletions. Specifically, a list that generates cloze deletions can be thought of as a flash card, with the first part (hint) being the front, and the second part (cloze) being the back. You can delimit the two parts with a dash `-` or an equals sign `=`.

You can configure whether the first part will become a cloze hint deletion with the `enable_hints` option in `list`.

This is meant to be used with the [Cloze (Hide All)](https://ankiweb.net/shared/info/838763277) plugin. For handling issues with curly braces, see [curly_braces.md](./curly_braces.md).

## Sample transformation

```markdown
- This won't become a cloze
- Neither will this, cloze=needs a space around delimiters.

1. A ordered list is - a list whose markers are numbers
2. Numbered lists = ordered lists

- Lists can be used to - organize information
- Unordered lists = lists
```

**_(default)_** With `{list: {enable_hints: false}}` :

```markdown
- This won't become a cloze
- Neither will this, cloze=needs a space around delimiters.

1. A ordered list is - {{c1::a list whose markers are numbers}}
2. Numbered lists = {{c2::ordered lists}}

- Lists can be used to - {{c3::organize information}}
- Unordered lists = {{c4::lists }}
```

With `{list: {enable_hints: true}}`:

```markdown
- This won't become a cloze
- Neither will this, cloze=needs a space around delimiters.

1. {{c1::::A ordered list is}} - {{c1::a list whose markers are numbers}}
2. {{c2::::Numbered lists}} = {{c2::ordered lists}}

- {{c3::::Lists can be used to}} - {{c3::organize information}}
- {{c4::::Unordered lists}} = {{c4::lists }}
```
