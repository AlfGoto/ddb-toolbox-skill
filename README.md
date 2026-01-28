# DynamoDB-Toolbox Skill

A skill for AI coding agents that provides guidance for [DynamoDB-Toolbox v2](https://github.com/dynamodb-toolbox/dynamodb-toolbox).

## Why use a skill?

Skills are more efficient than pasting documentation into context. They provide curated, concise guidance that activates only when relevant, saving tokens and giving more precise help than raw docs.

## Installation

```bash
npx skills add AlfGoto/ddb-toolbox-skill
```

That's it. The skill will automatically activate when you work with DynamoDB-Toolbox code.

## What it covers

- Table & Entity definitions with proper schemas
- The `.build()` pattern (GetItem, PutItem, UpdateItem, DeleteItem)
- Query & Scan operations
- Batch and Transaction operations
- Conditions and update expressions
- Single-table design patterns

## License

MIT
