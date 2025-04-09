# Anki Cloze-ify Templater Snippets
This is a script to be used with Obsidian's Templater plugin to automatically transform certain 

## Install
There are two steps to installing.
1. Add custom user script file
2. Add calls to user script files from Templater templates
### Adding Script Files
#### From Source
```bash
# Build the project
yarn build
# Make a symlink to your templater custom scripts directory
ln -s $(realpath .)/build/main.js <OBSIDIAN_TEMPLATER_SCRIPTS_DIR>/cloze_transform.js
```

### Templates
I have two templates:

```markdown
# template 1
<% tp.user.cloze_transform(tp.file.selection(), {"handle_curly": "fullwidth", "list": {"enable_hints": true}}) %>
# template 2
<% tp.user.cloze_transform(tp.file.selection(), {"handle_curly": "fullwidth", "list": {"enable_hints": false}}) %>
```

## Specifications

The Anki Clozeify script transforms selected text into Anki cloze deletion format. It supports various Markdown elements and provides options for customizing the transformation.

### Example

Below is a comprehensive example to intuitively understand the code transformation done.

**Input:**
````markdown
# Programming Concepts

## Lists
- Python is a high-level language - It's easy to read and write
- JavaScript runs in browsers - It's the language of the web
1. HTML structures content - It defines the layout of web pages
2. CSS styles content - It makes web pages visually appealing

## Code Example
```python
def greet(name):
    # This function prints a greeting
    if name == "World":
        print("Hello, World!")
    else:
        print(f"Hello, {name}!")
```

## Table of Languages
| Language | Paradigm | Typing |
|:---------|:--------:|-------:|
| Python   | Multi-paradigm | Dynamic |
| JavaScript | Multi-paradigm | Dynamic |
| Java     | Object-oriented | Static |
````

**Output (with `enable_hints: true` and `handle_curly: "fullwidth"`):**
````markdown
# Programming Concepts

## Lists
- {{c1::::Python is a high-level language}} - {{c1::It's easy to read and write}}
- {{c2::::JavaScript runs in browsers}} - {{c2::It's the language of the web}}
1. {{c3::::HTML structures content}} - {{c3::It defines the layout of web pages}}
2. {{c4::::CSS styles content}} - {{c4::It makes web pages visually appealing}}

## Code Example
```python
def greet(name):
    # This function prints a greeting
    {{c5::if name == "World":}}
        {{c5::print("Hello, World!")}}
    {{c5::else:}}
        {{c5::print(f"Hello, {name}!")}}
    
    call_irrelevant_function() # just leave a gap to get out of the cloze
```

## Table of Languages
| Language    | Paradigm         | Typing     |
|:----------- |:----------------:| ----------:|
| Python      | {{c7::Multi-paradigm}} | {{c8::Dynamic}} |
| JavaScript  | {{c9::Multi-paradigm}} | {{c10::Dynamic}} |
| Java        | {{c11::Object-oriented}} | {{c12::Static}} |
````

### Supported Markdown Elements

1. **Text**: Regular text can be transformed into cloze deletions.
2. **Lists**: Both ordered and unordered lists are supported.
   - With hints:
     - Format: `- Front - back` becomes `- {{c1::::Front}} - {{c1::back}}` (with hints)
     - Format: `- Front = back` becomes `- {{c1::::Front}} = {{c1::back}}` (with hints)
   - Without hints:
     - Format: `- Front - back` becomes `- Front - {{c1::back}}` (without hints)
     - Format: `- Front = back` becomes `- Front = {{c1::back}}` (without hints)
3. **Code Blocks**: Code blocks with various languages are supported.
   - Indentation is preserved (converts spaces to tabs)
   - HTML characters are properly escaped (`<`, `>`, `&`)
   - Curly braces are handled according to the specified option
4. **Tables**: Markdown tables are supported with proper alignment.

### Configuration Options

The script accepts the following options:

```typescript
{
  handle_curly: "fullwidth" | "zwj" | "insert_space",
  list: {
    enable_hints: boolean
  }
}
```

#### `handle_curly` Options
This options handles handing of right curly braces `}` from conflicting with Anki's cloze deletion syntax. E.g. in {{c1::`{{hello}}`}} - Anki improperly parses the first two curly braces "in code" to be the cloze deletion brackets.

- **`fullwidth`**: Replaces closing curly braces with full-width curly braces (｝)
- **`zwj`**: Inserts zero-width joiners between consecutive closing curly braces
- **`insert_space`**: Inserts spaces between consecutive closing curly braces

#### `list` Options

- **`enable_hints`**: When `true`, the first part of a list item becomes a hint (e.g., `{{c1::::Front}} - {{c1::back}}`). When `false`, only the second part becomes a cloze deletion (e.g., `Front - {{c1::back}}`).

### Examples

#### Lists with Hints

Input:
```
- Front - back
- Another - example
```

Output (with `enable_hints: true`):
```
- {{c1::::Front}} - {{c1::back}}
- {{c2::::Another}} - {{c2::example}}
```

Output (with `enable_hints: false`):
```
- Front - {{c1::back}}
- Another - {{c2::example}}
```

#### Code Blocks

Input:
```python
def test_parser():
    # comment
    for i in range(2):
        if i % 2 == 0:
            # comment
            while i < 1:
                print("Level 4")
```

Output:
```python
def test_parser():
    # comment
    {{c1::for i in range(2):}}
        {{c1::if i % 2 == 0:}}
            # comment
            {{c2::while i < 1:}}
                {{c2::print("Level 4")}}
```

#### Tables

Input:
```
| Row Headers | Center Aligned! | Right Aligned | Default Aligned |
|:----------- |:---------------:| -------------:| --------------- |
| Row 1       |   Row 1 Col 2   |   Row 1 Col 3 | Row 1 Col 4     |
```

Output:
```
| Row Headers    |   Center Aligned!    |        Right Aligned | Default Aligned      |
|:-------------- |:--------------------:| --------------------:| -------------------- |
| Row 1          | {{c1::Row 1 Col 2}}  |  {{c2::Row 1 Col 3}} | {{c3::Row 1 Col 4}}  |
```


