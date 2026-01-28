# DynamoDB-Toolbox Skill

An [Open Agent Skills](https://github.com/vercel-labs/agent-skills) package for [DynamoDB-Toolbox v2](https://github.com/dynamodb-toolbox/dynamodb-toolbox) - the lightweight TypeScript library for DynamoDB with type-safe query building and schema validation.

Works with Codex, Cursor, Claude Code, and other AI agents supporting the Agent Skills standard.

## Installation

### Via Skills CLI (Recommended)

```bash
npx skills add AlfGoto/ddb-toolbox-skill
```

### Manual Installation

Copy the skill folder to your agent's skills directory:

```bash
# Clone the repo
git clone https://github.com/AlfGoto/ddb-toolbox-skill.git
cd ddb-toolbox-skill

# For Codex
cp -r skills/dynamodb-toolbox .codex/skills/

# For Cursor
cp -r skills/dynamodb-toolbox .cursor/skills/

# For Claude Code
cp -r skills/dynamodb-toolbox .claude/skills/
```

## What This Skill Does

This skill activates when you're working with DynamoDB-Toolbox code, providing contextual guidance for:

- **Table & Entity definitions** - Proper schema setup with type safety
- **The `.build()` pattern** - GetItem, PutItem, UpdateItem, DeleteItem commands
- **Query & Scan operations** - Table-level operations with filtering and pagination
- **Batch operations** - BatchGet and BatchWrite with multiple entities
- **Transactions** - TransactGet and TransactWrite for atomic operations
- **Conditions** - Conditional expressions for writes
- **Single-table design** - Patterns for multi-entity tables

## Triggers

The skill automatically activates when the agent detects:

- Imports from `dynamodb-toolbox/*`
- Entity or Table definitions
- `.build()` command patterns
- DynamoDB-Toolbox schema definitions

## Repository Structure

```
dynamodb-toolbox-skill/
├── package.json
├── skills/
│   └── dynamodb-toolbox/
│       ├── SKILL.md              # Main skill instructions
│       └── references/
│           └── api.md            # Detailed API reference
└── scripts/
    ├── validate.js               # Validates skill format
    └── build.js                  # Builds distribution package
```

## Development

### Validate Skills

```bash
npm run validate
```

### Build Package

```bash
npm run build
```

This creates a `dist/` folder with the packaged skills and a `manifest.json`.

## Example Usage

Once installed, just write code using DynamoDB-Toolbox and the agent will provide type-safe suggestions:

```typescript
import { Entity } from 'dynamodb-toolbox/entity'
import { PutItemCommand } from 'dynamodb-toolbox/entity/actions/put'

// Agent will help with schema definitions, command patterns, and best practices
```

## License

MIT
