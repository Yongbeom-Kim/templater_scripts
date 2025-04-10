# Transforming Tables to Cloze Deletions

Tables are another way to create cloze deletions. Assuming the header row are column headers and the first column is row headers, all non-header cells are transformed into cloze deletions.

For a table like:

|       | Header 1 | Header 2 | Header 3 |
| ----- | -------- | -------- | -------- |
| Row 1 | Cell 1   | Cell 2   |          |
| Row 2 | Cell 5   |          | Cell 7   |
| Row 3 |          | Cell 10  | Cell 11  |
| Row 4 | Cell 13  | Cell 14  | Cell 15  |

It is transformed into:

|       | Header 1         | Header 2         | Header 3         |
| ----- | ---------------- | ---------------- | ---------------- |
| Row 1 | {{c1::Cell 1}}   | {{c2::Cell 2}}   | {{c3::}}         |
| Row 2 | {{c4::Cell 5}}   | {{c5::}}         | {{c6::Cell 7}}   |
| Row 3 | {{c7::}}         | {{c8::Cell 10}}  | {{c9::Cell 11}}  |
| Row 4 | {{c10::Cell 13}} | {{c11::Cell 14}} | {{c12::Cell 15}} |
