---
name: new-schema
description: Scaffold a new Sanity schema type following project conventions
---

Create a new Sanity schema type. The user provides a type name and whether it's a `document` or `object`.

## Rules

- **File name**: kebab-case, placed in `src/sanity/schemaTypes/documents/` (for documents) or `src/sanity/schemaTypes/objects/` (for objects)
- **Imports**: Use `defineType` and `defineField` from `'sanity'`
- **Romanian**: All `title`, `description`, and option `title` values must be in Romanian
- **Icons**: Pick an appropriate icon from `@sanity/icons`
- **Export**: Add the export to `src/sanity/schemaTypes/index.ts`
- **Structure**: If document type, add it to the Studio structure in `sanity.config.ts`

## Example

```ts
import { DocumentIcon } from '@sanity/icons';
import { defineField, defineType } from 'sanity';

export const examplePage = defineType({
  name: 'examplePage',
  title: 'Pagina exemplu',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Titlu',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
  ],
});
```
