# Anki Cloze-ify Templater Snippets
This is a script used together with Obsidian's [Templater](https://obsidian.md/plugins?id=templater-obsidian) and [Obsidian_to_Anki](https://github.com/ObsidianToAnki/Obsidian_to_Anki) plugins.

The reason why I created this script was because (1) I wanted to have an easy way of creating Anki notes from Obsidian, but (2) I wanted to do it in a way that takes as little time as possible. You won't catch me manually creating flash cards or cloze deletions. I also don't really like seeing all the `<!--ID: 1711270037948-->` comments generated in my notes.

This Templater script transforms Markdown code to Cloze deletions based on a few simple rules, so that it can be painlessly integrated, but out of sight, into each note. Watch me create some cloze deletions with a few Templater templates and vim keybinds:

![demo](https://github.com/user-attachments/assets/ba8556ac-357f-4b89-9af9-ca0fefcb0f61)

## Overview

The Anki Clozeify script transforms selected text into Anki cloze deletion format. It supports various Markdown elements and provides options for customizing the transformation.

Specifically, it converts the following elements into cloze deletions:
- Lists
- Code blocks
- Tables

To see more, go to the specifications documents.
- [List](./doc/spec/lists.md)
- [Code blocks](./doc/spec/code_blocks.md)
- [Tables](./doc/spec/tables.md)

For other miscellaneous transformations:
- [Handling Curly Braces](./doc/spec/curly_braces.md)

### Example

Below is a nice example to intuitively understand the transformation done.

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
| Language   |    Paradigm     |  Typing |
|:---------- |:---------------:| -------:|
| Python     | Multi-paradigm  | Dynamic |
| JavaScript | Multi-paradigm  | Dynamic |
| Java       | Object-oriented |  Static |
````

**Sample Output:**
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
| Language           |         Paradigm         |           Typing |
|:------------------ |:------------------------:| ----------------:|
| {{c6::Python}}     |  {{c7::Multi-paradigm}}  |  {{c8::Dynamic}} |
| {{c9::JavaScript}} | {{c10::Multi-paradigm}}  | {{c11::Dynamic}} |
| {{c12::Java}}      | {{c13::Object-oriented}} |  {{c14::Static}} |
````

## Install
Havent thought about this yet

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

