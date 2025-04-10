# Handling Curly Braces

Handling curly braces is important, because:

1. Conflicts with Anki's Cloze deletion parsing. (takes the nearest double curly braces)
2. Issues with Anki's [Cloze (Hide All)](https://ankiweb.net/shared/info/838763277) plugin (cloze deletions with the `}` character are not hidden for some reason)
3. MathJax uses `}` and it is very important to all MathJax text. <span style="color: grey">(TODO: Currently, I do not parse MathJax separately)</span>

Take these deletions that will be improperly parsed (cloze deletion in bold, problem in red).
| Original | Cloze Deletion |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| <code>ending_curly}</code> | <code><strong>{{c1::ending_curly}}</strong><span style="background-color:red">}</span></code> |
| <code>"double_curly}}"</code> | <code><strong>{{c1::"double_curly}}"</strong><span style="background-color:red">}}</span></code> |

There are three ways we can fix this.

1. Put a space between consecutive curly braces
2. Put a zero-width joiner character between curly braces
3. **(Default)** Replace curly braces with another unicode character (fullwidth curly braces) that _looks like_ curly braces

3 is the default primarily due to working around the Cloze (Hide All) plugin limitations.

You can configure these options by setting `handle_curly` to one of the following values: `"fullwidth"`, `"zwj"`, or `"insert_space"`. (E.g. `clozify(text, {handle_curly: "fullwidth"})`)

## Inserting Spaces (`{handle_curly: "insert_space"}`)

| Original                      | Cloze Deletion                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| <code>ending_curly}</code>    | <code><strong>{{c1::ending_curly}<span style="background-color: lightgray"> </span>}}</strong></code>     |
| <code>"double_curly}}"</code> | <code><strong>{{c1::"double_curly}<span style="background-color: lightgray"> </span>}"}} </strong></code> |

### Pros

- Non-invasive, does not use funny and strange characters
- This is probably the only

### Cons

- Changes note content - maybe you DO want double braces specifically, without a space in them for some reason.
- Cloze deletions with right curly brackets `}` are _not_ hidden by the [Cloze (Hide All)](https://ankiweb.net/shared/info/838763277) plugin for some reason

## Inserting Zero-Width Joiners (`{handle_curly: "zwj"}`)

| Original                      | Cloze Deletion                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| <code>ending_curly}</code>    | <code><strong>{{c1::ending_curly}<span style="background-color: lightgray">‍</span>}}</strong></code>     |
| <code>"double_curly}}"</code> | <code><strong>{{c1::"double_curly}<span style="background-color: lightgray">‍</span>}"}} </strong></code> |

### Pros

- ZWJ is invisible: Preserves appearance of note content, while fixing cloze parsing problems.

### Cons

- Abuses ZWJ character
- I'm not sure if this breaks MathJax.
- Typically, "{Character}{ZWJ}{Character}" is considered _one_ character by many editors. If you edit this in an editor, you might delete all the consecutive `}` character all at once.
- Cloze deletions with right curly brackets `}` are _not_ hidden by the [Cloze (Hide All)](https://ankiweb.net/shared/info/838763277) plugin for some reason

## Replacing with Fullwidth Curly Braces (`{handle_curly: "fullwidth"}`)

| Original                      | Cloze Deletion                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| <code>ending_curly}</code>    | <code><strong>{{c1::ending_curly<span style="background-color: lightgray">｝</span>}}</strong></code>      |
| <code>"double_curly}}"</code> | <code><strong>{{c1::"double_curly<span style="background-color: lightgray">｝｝</span>"}} </strong></code> |

### Pros

- Prevents issue with [Cloze (Hide All)](https://ankiweb.net/shared/info/838763277) plugin, since this is technically not a right curly bracket

### Cons

- Abuses funny and strange character
- Breaks MathJax <span style="color: gray">(TODO: implement proper MathJax parsing)</span>
- Fullwidth looks ugly, and occupies really long width for some reason
