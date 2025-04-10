# Transforming Code Blocks to Cloze Deletions

Code blocks are one way to generate cloze deletions. To mark a series of rows for cloze deletions, put a comment above those rows. This comment also effectively serves as a hint for the cloze deletion itself. To "break out" of a cloze deletion, just put a blank line.

For handling curly braces in code, refer to [curly_braces.md](./curly_braces.md)

## Sample Transformation

```c++
#include <iostream>
using namespace std;

int main() {
  // print "Hello World! x2"
  cout << "Hello, World!" << endl;
  cout << "Hello, World!" << endl;

  some_irrelevant_function(); // blank line separates cloze deletions
  // return code 0
  return 0;

}
```

This becomes:

```c++
#include <iostream>
using namespace std;

int main() {
  // print "Hello World! x2"
  {{c1::cout << "Hello, World!" << endl;}}
  {{c1::cout << "Hello, World!" << endl;}}

  some_irrelevant_function(); // blank line separates cloze deletions
  // return code 0
  {{c2::return 0;}}

}
```

## Configurable Options

The following is the configuration options for transforming clozes.

```json
{
  code: {
    transform_mode: "markdown_block" | "markdown_inline" | "html_block" | "html_inline" ;
  }
}
```

The `code.transform_mode` key allows you to specify the _format_ of the outputted code block.

### `code.transform_mode`: General Transformation Scheme

The `code.transform_mode` option controls how the transformed code blocks are outputted. Here are the different modes and their behaviors:

- `markdown_block`: Code is output as a markdown code block.
- `markdown_inline`: Each line in the code block is output as multiple inline markdown code block.
- `html_block`: Code block is output as a `<pre><code>` block in HTML.
- `html_inline`: Each line in the code block is output as inline HTML code `<pre><code>` block.

The `<pre><code>` block above is actually the following tags: `<pre style="white-space: pre-wrap; overflow-wrap: normal;"><code class="language-X">`

- In `<pre>`, `white-space: pre-wrap; overflow-wrap: normal;` allows the code to line wrap for a better mobile experience, and
- `<code class="language-X">` was added in hopes that Anki would support this syntax highlighting. It did not, but there is no harm in removing it.

By default, `code.transform_mode = "html_block"`. This is because it is the simplest output behaves well in Anki.

Specifically, for the code block

````markdown
```c++
#include <iostream>
using namespace std;

int main() {
  // print "Hello World!"
  cout << "Hello, World!" << endl;

  return 0;
}
```
````

we have the following behavior:

#### `{code: { transform_mode: "markdown_block" }}`

````markdown
```c++
#include <iostream>
using namespace std;

int main() {
  // print "Hello World!"
  {{c1::cout << "Hello, World!" << endl;}}

  return 0;
}
```
````

##### Pros

- Simple

##### Cons

- **No Line Wrapping**: terrible experience on mobile

#### `{code: { transform_mode: "markdown_inline" }}`

```markdown
`#include <iostream>`
`using namespace std;`

`int main() {`
`  // print "Hello World!"`
`  {{c1::cout << "Hello, World!" << endl;}}`

`  return 0;`
`}`
```

##### Pros

- Simple
- Line wraps properly!

##### Cons

- Indents are dubious
- You cannot use backticks in your code.

#### `{code: { transform_mode: "html_block" }}`

```markdown
<pre style="white-space: pre-wrap; overflow-wrap: normal;">
<code class="language-cpp">
#include <iostream>
using namespace std;

int main() {
  // print "Hello World!"
  {{c1::cout << "Hello, World!" << endl;}}

  return 0;
}
</code>
</pre>
```

##### Pros

- Somewhat simple
- You can use backticks in your code
- Supports line wrapping! So good on mobile

##### Cons

- Angle brackets & escaped characters (TODO: workaround with similar unicode characters)
  - If you use angle brackets in your code, Obsidian's Live Preview mode runs into issues (OK in Anki, OK in view mode)
  - If you escape them (e.g. `&lt;`), Anki just literally displays it as `"&lt;"`

#### `{code: { transform_mode: "html_inline" }}`

```markdown
<pre style="white-space: pre-wrap; overflow-wrap: normal;"><code class="language-cpp">#include <iostream></code></pre>
<pre style="white-space: pre-wrap; overflow-wrap: normal;"><code class="language-cpp">using namespace std;</code></pre>

<pre style="white-space: pre-wrap; overflow-wrap: normal;"><code class="language-cpp">int main() {</code></pre>
  <pre style="white-space: pre-wrap; overflow-wrap: normal;"><code class="language-cpp">// print "Hello World!"</code></pre>
  <pre style="white-space: pre-wrap; overflow-wrap: normal;"><code class="language-cpp">{{c1::cout << "Hello, World!" << endl;}}</code></pre>

  <pre style="white-space: pre-wrap; overflow-wrap: normal;"><code class="language-cpp">return 0;</code></pre>
<pre style="white-space: pre-wrap; overflow-wrap: normal;"><code class="language-cpp">}</code></pre>
```

##### Notes

- Super messy
- Literally `html_block`, but worse

## Miscellaneous

### Indent Normalization

All indents are normalized to tabs, and any spaces are converted to tabs as well.

For space indents, the following scheme is used:

1. If indents are a multiple of 4 (spaces), then 4 spaces = 1 tab.
2. Else, 2 spaces = 1 tab. Odd number of spaces are rounded up.

### Supported Languages

The following languages are supported:

- CSS (`css`)
- C (`c`)
- C++ (`cpp`, `c++`)
- Go (`go`)
- Groovy (`groovy`)
- HCL (`hcl`)
- Javascript (`javascript`, `js`)
- Jsx (`jsx`)
- Tsx (`tsx`)
- Typescript (`ts`, `typescript`)
- Python (`py`, `python`)
- PL/SQL (`plsql`)
- SQL (`sql`)
- TOML (`toml`)
- Yaml (`yaml`, `yml`)
