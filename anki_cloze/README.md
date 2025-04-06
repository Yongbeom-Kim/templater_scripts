# Anki Clozeify Templater Snippets

## Specifications

### Transforming Text

#### Ordered Lists, Unordered Lists to Cloze

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
