# Anki Clozeify Templater Snippets

## Install

- `ln -s $(realpath .)/build/main.js <OBSIDIAN_TEMPLATER_SCRIPTS_DIR>/cloze_transform.js`

## Specifications

### Transforming Text

#### Ordered Lists, Unordered Lists to Cloze
Here, cloze templates function like normal flash cards, with the FRONT and BACK separated by a dash (` - `) or equals sign(` - `).

```markdown
- normal text
- Front - Back
  - Front = Back
1. Front - Back
  1. Front = Back
  2. Front = Back
```
becomes:
```markdown
%% Note: First part `{{c1::::Front}}` can remain as `Front` with toggle
- normal text
- {{c1::::Front}} - {{c1::Back}}
  - {{c2::::Front}} = {{c2::Back}}
1. {{c3::::Front}} - {{c3::Back}}
  1. {{c4::::Front}} = {{c4::Back}}
  2. {{c5::::Front}} = {{c5::Back}}
```

### Transforming Code

As of the moment, nested code blocks are not supported.
`````markdown
````markdown
- Text
```python
def fn():
  code()
```
````
`````
#### Comments as Cloze Deletion Markers
"Code" refers to markdown code blocks, typically written as triple backticks (<code>```</code>).
In this section, comments are used as markers to indicate cloze deletions within the code.

A code line is converted into a cloze deletion if:
- It is either preceded by a comment or another line converted into a cloze deletion.
- Blank lines (potentially with spaces) are never converted into cloze deletions.

A comment spawns a cloze deletion if:
- The entire line is a (potentially indented) comment (i.e. there is no code before the comment).

Only single-line comments are supported. For languages that support block comments, please ensure block comments are only encompass a single line.

 Below is an example demonstrating how this works:

````markdown
```python
# comment
def function():
  # another comment
  some_implementation()
  some_more_implementation()

  some_other_implementation() # this comment doesn't count
  os.exit(1)
```
````
This becomes:
````markdown
```python
# comment
{{c1::def function():}}
  # another comment
  {{c2::some_implementation()}}
  {{c2::some_more_implementation()}}

  some_other_implementation() # this comment doesn't count
  os.exit(1)
```
````
Note that multiline comments are not supported (too much work to write a proper parser for so many languages), so this is the specified behavior:
```c++
/* This is
not ok
*/
int main() {
  // comment
  call_some_function();

  /* This is ok */
  call_some_function();

}
```
This becomes:
```
/* This is
{{c1::not ok}}
{{c1::*/}}
{{c1::int main() {}}
  // comment
  {{c2::call_some_function();}}

  /* This is ok */
  {{c3::call_some_function();}}
}
```
Not ideal, so we should keep multiline comments to a single line.

#### Conflicts with Curly Braces
We note that Anki's cloze deletions are delimited by double curly braces, and they take the nearest double curly brace, and therefore any unintended `}}` will throw our clozes off. We resolve this with Zero-Width Joiners (ZWJ), which insert a character in between problematic braces while being invisible.

##### Lines ending with curly braces

Take this program:

```c++
// Function that returns 1
int function() {
  return 1
}
```

If we were to transform it as such:

```c++
// Function that returns 1
{{c1::int function() {}}
  {{c1::return 1}}
{{c1::}}} // there is a problem here
```

we would run into an issue where Anki thinks the first two braces delimit the cloze deletion. We resolve this issue by adding a ZWJ (visually represented by `_`):

```c++
// Function that returns 1
{{c1::int function() {}}
  {{c1::return 1}}
{{c1::}_}} // now there is no problem.
```

##### Code with double curly braces
This is not so common, but we can craft an example.

```c++
std::vector<int> nums = {1, 2, 3, 4, 5};

std::for_each(nums.begin(), nums.end(), [](int n) {
  // Cloze delete this
  if (n % 2 == 0) {
    std::cout << n << " is even\n";
  }}); // Oops, double curly braces

return 0;

```
Again, we handle this by adding a ZWJ (`_`) to prevent conflicts.

```c++
std::vector<int> nums = {1, 2, 3, 4, 5};

std::for_each(nums.begin(), nums.end(), [](int n) {
  // Cloze delete this
  {{c1::if (n % 2 == 0) {}}
    {{c1::std::cout << n << " is even\n";}}
  {{c1::}_}); // Oops, double curly braces}}

return 0;

```

For more consecutive curly braces (`}}}`), a ZWJ is added every other curly braces (`}_}_}`).

#### `<pre>`, `<code>` and line wrapping
Typically, markdown <code>```</code> code blocks is converted into a series of `<pre><code></pre></code>` blocks, which typically prevents line wrapping. This, however, leads to a _horrible_ experience using Anki on phones.

Therefore, any code:
````markdown
```python
def fn():
  do_something()
```
````

is converted into:
````markdown
<pre style="white-space: pre-wrap; overflow-wrap: normal;">
<code class="language-python">
def fn():
  do_something()
</code>
</pre>
````

The additional style tags in `<pre>` will allow line wrapping, and the class in `<code>` will (hopefully) add syntax highlighting.

#### Normalizing Indents

Indents are a problem. 4 spaces, 2 spaces, or tabs?

All code indents are normalized to tabs. For all indents in a code block, we count the number of spaces in it. If there are no spaces, everything is tabs. Great! Some indents have some spaces not a multiple of 4, we consider 2 spaces = 1 indent, and replace every 2 spaces with a tab. If there is an odd number of spaces, we round the last remaining space with another tab. Otherwise, we just replace every 4 spaces with tabs.

