# DynamoDB-Toolbox v2 API Reference

## Table of Contents

1. [Table Configuration](#table-configuration)
2. [Entity Configuration](#entity-configuration)
3. [Schema Types](#schema-types)
4. [Attribute Modifiers](#attribute-modifiers)
5. [Entity Actions](#entity-actions)
6. [Table Actions](#table-actions)
7. [Condition Expressions](#condition-expressions)
8. [Update Expressions](#update-expressions)
9. [Type Inference](#type-inference)

---

## Table Configuration

```typescript
import { Table } from 'dynamodb-toolbox/table'

new Table({
  // Required
  documentClient: DynamoDBDocumentClient,
  name: string | (() => string),
  partitionKey: { name: string, type: 'string' | 'number' | 'binary' },

  // Optional
  sortKey?: { name: string, type: 'string' | 'number' | 'binary' },
  indexes?: {
    [indexName: string]: {
      type: 'global' | 'local',
      partitionKey?: { name: string, type: 'string' | 'number' | 'binary' }, // Required for GSI
      sortKey?: { name: string, type: 'string' | 'number' | 'binary' }
    }
  },
  entityAttributeSavedAs?: string,  // Default: 'entity'
  meta?: Record<string, unknown>
})
```

### Table Methods

```typescript
table.build(Action)  // Build an action (QueryCommand, ScanCommand, BatchGetCommand, etc.)
table.name           // Get table name
```

---

## Entity Configuration

```typescript
import { Entity } from 'dynamodb-toolbox/entity'

new Entity({
  // Required
  name: string,
  table: Table,
  schema: ItemSchema,

  // Optional
  computeKey?: (item) => { [keyAttr]: value },
  entityAttribute?: {
    hidden?: boolean,
    savedAs?: string
  } | false,
  timestamps?: boolean | {
    created?: {
      name?: string,
      savedAs?: string,
      hidden?: boolean
    },
    modified?: {
      name?: string,
      savedAs?: string,
      hidden?: boolean
    }
  },
  meta?: Record<string, unknown>
})
```

### Entity Methods

```typescript
entity.build(Action)  // Build an action
entity.name           // Get entity name
entity.table          // Get associated table
```

---

## Schema Types

### Import

```typescript
import {
  item,
  string, number, boolean, binary, any,
  list, set, map, record, anyOf
} from 'dynamodb-toolbox/schema'
```

### Primitive Types

```typescript
string()     // String attribute
number()     // Number attribute (JS number by default)
number().big() // BigInt for large numbers
boolean()    // Boolean attribute
binary()     // Binary attribute (Uint8Array)
any()        // Any type, no validation
any().castAs<MyType>() // Cast to specific TypeScript type
```

### Collection Types

```typescript
// List - ordered collection
list(elementSchema)
list(string())
list(map({ name: string() }))

// Set - unordered unique values (string, number, or binary only)
set(string())
set(number())
set(binary())

// Map - object with known keys
map({
  name: string(),
  age: number().optional()
})

// Record - object with dynamic keys
record(keySchema, valueSchema)
record(string(), number())  // { [key: string]: number }
record(string().enum('a', 'b'), string()) // Only 'a' or 'b' as keys
```

### Union Types (anyOf)

```typescript
// Discriminated union
anyOf(
  map({ type: string().const('dog'), breed: string() }),
  map({ type: string().const('cat'), lives: number() })
).discriminate('type')  // Optimize parsing with discriminator

// Simple union
anyOf(string(), number())
```

### Item Schema

```typescript
// Define entity schema
const schema = item({
  pk: string().key(),
  sk: string().key(),
  name: string(),
  count: number().default(0)
})

// Extend schema
const extended = schema.and({ newAttr: string() })

// Pick attributes
const partial = schema.pick('pk', 'sk', 'name')

// Omit attributes
const withoutCount = schema.omit('count')
```

---

## Attribute Modifiers

All schema types support these modifiers:

```typescript
schema
  // Requirement
  .required()                    // Required (default: 'atLeastOnce')
  .required('atLeastOnce')       // Required on create
  .required('always')            // Required on create AND update
  .required('never')             // Optional
  .optional()                    // Shorthand for .required('never')

  // Visibility
  .hidden()                      // Omit from formatted output
  .hidden(true)
  .hidden(false)

  // Key
  .key()                         // Mark as part of primary key
  .key(true)
  .key(false)

  // Rename in DynamoDB
  .savedAs('db_attribute_name')

  // Enum (finite set of values)
  .enum('value1', 'value2', 'value3')
  string().const('fixed')        // Single allowed value

  // Default values
  .default('static value')
  .default(() => generateId())   // Getter function
  .default(() => new Date().toISOString())

  // Derived values (from other attributes)
  .link<Schema>(({ otherAttr }) => transform(otherAttr))

  // Validation
  .validate(value => value.length > 0)
  .validate(value => value > 0, 'Must be positive')

  // Transformation (parse/format)
  .transform({
    parse: (raw) => processed,
    format: (processed) => raw
  })
```

### Number-specific

```typescript
number()
  .big()  // Use BigInt instead of number
```

### Map-specific

```typescript
map({ ... })
  .and({ newKey: string() })   // Extend with new attributes
  .pick('key1', 'key2')        // Pick specific keys
  .omit('key3')                // Omit specific keys
```

### Record-specific

```typescript
record(keySchema, valueSchema)
  .partial()  // All values optional
```

---

## Entity Actions

### GetItemCommand

```typescript
import { GetItemCommand } from 'dynamodb-toolbox/entity/actions/get'

await entity.build(GetItemCommand)
  .key({ pkAttr: 'value', skAttr: 'value' })
  .options({
    consistent?: boolean,           // Strongly consistent read
    attributes?: string[],          // Attributes to project
    capacity?: 'INDEXES' | 'TOTAL' | 'NONE',
    tableName?: string              // Override table name
  })
  .send({ abortSignal? })

// Response
{ Item?: FormattedItem, ... }
```

### PutItemCommand

```typescript
import { PutItemCommand } from 'dynamodb-toolbox/entity/actions/put'

await entity.build(PutItemCommand)
  .item({ /* full item data */ })
  .options({
    condition?: ConditionExpression,
    returnValues?: 'NONE' | 'ALL_OLD',
    returnValuesOnConditionFalse?: 'NONE' | 'ALL_OLD',
    metrics?: 'NONE' | 'SIZE',
    capacity?: 'INDEXES' | 'TOTAL' | 'NONE',
    tableName?: string
  })
  .send({ abortSignal? })

// Response
{ Attributes?: FormattedItem, ToolboxItem: GeneratedItem, ... }
```

### UpdateItemCommand

```typescript
import { UpdateItemCommand } from 'dynamodb-toolbox/entity/actions/update'
import { $add, $remove, $set, $append, $prepend, $get } from 'dynamodb-toolbox/entity/actions/update'

await entity.build(UpdateItemCommand)
  .item({
    // Key attributes required
    pkAttr: 'value',
    // Regular updates
    stringAttr: 'new value',
    // Extended syntax
    numberAttr: $add(5),
    removedAttr: $remove(),
    listAttr: $append(['item']),
    mapAttr: $set({ complete: 'replacement' })
  })
  .options({
    condition?: ConditionExpression,
    returnValues?: 'NONE' | 'UPDATED_OLD' | 'UPDATED_NEW' | 'ALL_OLD' | 'ALL_NEW',
    returnValuesOnConditionFalse?: 'NONE' | 'ALL_OLD',
    metrics?: 'NONE' | 'SIZE',
    capacity?: 'INDEXES' | 'TOTAL' | 'NONE',
    tableName?: string
  })
  .send({ abortSignal? })
```

### UpdateAttributesCommand

Like UpdateItemCommand but deep attributes (maps, lists) are completely replaced instead of merged.

```typescript
import { UpdateAttributesCommand } from 'dynamodb-toolbox/entity/actions/updateAttributes'
```

### DeleteItemCommand

```typescript
import { DeleteItemCommand } from 'dynamodb-toolbox/entity/actions/delete'

await entity.build(DeleteItemCommand)
  .key({ pkAttr: 'value', skAttr: 'value' })
  .options({
    condition?: ConditionExpression,
    returnValues?: 'NONE' | 'ALL_OLD',
    returnValuesOnConditionFalse?: 'NONE' | 'ALL_OLD',
    metrics?: 'NONE' | 'SIZE',
    capacity?: 'INDEXES' | 'TOTAL' | 'NONE',
    tableName?: string
  })
  .send({ abortSignal? })
```

### BatchGetRequest

```typescript
import { BatchGetRequest } from 'dynamodb-toolbox/entity/actions/batchGet'

const request = entity.build(BatchGetRequest)
  .key({ pkAttr: 'value' })
  .options({ attributes?: string[] })
```

### BatchPutRequest / BatchDeleteRequest

```typescript
import { BatchPutRequest, BatchDeleteRequest } from 'dynamodb-toolbox/entity/actions/batchWrite'

const putRequest = entity.build(BatchPutRequest).item({ ... })
const deleteRequest = entity.build(BatchDeleteRequest).key({ ... })
```

### GetTransaction

```typescript
import { GetTransaction } from 'dynamodb-toolbox/entity/actions/transactGet'

const transaction = entity.build(GetTransaction)
  .key({ ... })
  .options({ attributes?: string[] })
```

### PutTransaction / UpdateTransaction / DeleteTransaction

```typescript
import { PutTransaction } from 'dynamodb-toolbox/entity/actions/transactPut'
import { UpdateTransaction } from 'dynamodb-toolbox/entity/actions/transactUpdate'
import { DeleteTransaction } from 'dynamodb-toolbox/entity/actions/transactDelete'

const putTx = entity.build(PutTransaction)
  .item({ ... })
  .options({ condition? })

const updateTx = entity.build(UpdateTransaction)
  .item({ ... })
  .options({ condition? })

const deleteTx = entity.build(DeleteTransaction)
  .key({ ... })
  .options({ condition? })
```

### ConditionCheck

```typescript
import { ConditionCheck } from 'dynamodb-toolbox/entity/actions/conditionCheck'

const check = entity.build(ConditionCheck)
  .key({ ... })
  .options({ condition: ConditionExpression })
```

### AccessPattern

```typescript
import { AccessPattern } from 'dynamodb-toolbox/entity/actions/accessPattern'

const pattern = entity.build(AccessPattern)
  .schema(item({ inputAttr: string() }))
  .pattern(({ inputAttr }) => ({
    partition: `PREFIX#${inputAttr}`,
    index?: 'GSI1',
    range?: { beginsWith: 'RANGE#' }
  }))
  .options({ /* default query options */ })

const { Items } = await pattern.query({ inputAttr: 'value' }).send()
```

---

## Table Actions

### QueryCommand

```typescript
import { QueryCommand } from 'dynamodb-toolbox/table/actions/query'

await table.build(QueryCommand)
  .query({
    partition: 'partition-value',
    index?: 'IndexName',
    range?: RangeCondition  // See below
  })
  .entities(Entity1, Entity2)  // Optional: filter/format by entities
  .options({
    consistent?: boolean,
    reverse?: boolean,            // Reverse sort order
    limit?: number,
    exclusiveStartKey?: Key,
    maxPages?: number,            // Fetch multiple pages
    filters?: ConditionExpression | ConditionExpression[],
    attributes?: string[],
    capacity?: 'INDEXES' | 'TOTAL' | 'NONE',
    tableName?: string
  })
  .send({ abortSignal? })

// Response
{
  Items: FormattedItem[],
  Count: number,
  ScannedCount: number,
  LastEvaluatedKey?: Key,
  ...
}
```

#### Range Conditions

```typescript
{ eq: value }
{ lt: value }
{ lte: value }
{ gt: value }
{ gte: value }
{ between: [low, high] }
{ beginsWith: prefix }
```

### ScanCommand

```typescript
import { ScanCommand } from 'dynamodb-toolbox/table/actions/scan'

await table.build(ScanCommand)
  .entities(Entity1, Entity2)  // Optional
  .options({
    index?: 'IndexName',
    consistent?: boolean,
    limit?: number,
    exclusiveStartKey?: Key,
    maxPages?: number,
    filters?: ConditionExpression | ConditionExpression[],
    attributes?: string[],
    segment?: number,           // For parallel scan
    totalSegments?: number,     // For parallel scan
    capacity?: 'INDEXES' | 'TOTAL' | 'NONE',
    tableName?: string
  })
  .send({ abortSignal? })
```

### BatchGetCommand

```typescript
import { BatchGetCommand } from 'dynamodb-toolbox/table/actions/batchGet'
import { execute } from 'dynamodb-toolbox/table/actions/batchGet'

const command = table.build(BatchGetCommand)
  .requests(request1, request2, ...)
  .options({
    consistent?: boolean,
    attributes?: string[]
  })

const { Responses } = await execute(command, {
  capacity?: 'INDEXES' | 'TOTAL' | 'NONE',
  documentClient?: DynamoDBDocumentClient,
  maxAttempts?: number
})
```

### BatchWriteCommand

```typescript
import { BatchWriteCommand } from 'dynamodb-toolbox/table/actions/batchWrite'
import { execute } from 'dynamodb-toolbox/table/actions/batchWrite'

const command = table.build(BatchWriteCommand)
  .requests(putRequest1, deleteRequest1, ...)

await execute(command, {
  capacity?: 'INDEXES' | 'TOTAL' | 'NONE',
  metrics?: 'NONE' | 'SIZE',
  documentClient?: DynamoDBDocumentClient,
  maxAttempts?: number
})
```

---

## Condition Expressions

Use in `.options({ condition: ... })` for conditional operations:

```typescript
// Comparison
{ attr: 'name', eq: 'value' }
{ attr: 'count', ne: 0 }
{ attr: 'age', lt: 18 }
{ attr: 'age', lte: 18 }
{ attr: 'age', gt: 18 }
{ attr: 'age', gte: 18 }
{ attr: 'score', between: [0, 100] }

// String operations
{ attr: 'name', beginsWith: 'prefix' }
{ attr: 'description', contains: 'keyword' }

// Existence
{ attr: 'email', exists: true }
{ attr: 'deletedAt', exists: false }

// Type check
{ attr: 'data', type: 'S' }  // S, N, B, SS, NS, BS, M, L, NULL, BOOL

// Size
{ attr: 'list', size: { gt: 0 } }

// Logical operators
{ and: [condition1, condition2] }
{ or: [condition1, condition2] }
{ not: condition }

// Nested attributes
{ attr: 'profile.name', eq: 'value' }
{ attr: 'items[0].id', eq: 'value' }
```

---

## Update Expressions

Import update operations:

```typescript
import {
  $set, $remove, $add, $delete,
  $append, $prepend, $get
} from 'dynamodb-toolbox/entity/actions/update'
```

### Operations

```typescript
// Set value (override, useful for deep attributes)
mapAttr: $set({ complete: 'replacement' })

// Remove attribute
oldAttr: $remove()

// Add to number
counter: $add(1)
counter: $add(-5)

// Add to set
tags: $add(new Set(['tag1', 'tag2']))

// Delete from set
tags: $delete(new Set(['oldTag']))

// Append to list
items: $append(['newItem'])
items: $append([{ id: '1' }])

// Prepend to list
items: $prepend(['firstItem'])

// Reference another attribute
copyOfName: $get('name')
computed: $get('nested.value')
```

### Partial Updates (Default Behavior)

By default, nested attributes (maps) are partially updated:

```typescript
// If current: { profile: { name: 'John', age: 30 } }
await entity.build(UpdateItemCommand)
  .item({
    id: '1',
    profile: { name: 'Jane' }  // Only updates name, keeps age
  })
  .send()
// Result: { profile: { name: 'Jane', age: 30 } }
```

Use `$set` to fully replace:

```typescript
await entity.build(UpdateItemCommand)
  .item({
    id: '1',
    profile: $set({ name: 'Jane' })  // Replaces entire profile
  })
  .send()
// Result: { profile: { name: 'Jane' } }
```

---

## Type Inference

### Input Types

```typescript
import type {
  PutItemInput,
  UpdateItemInput,
  KeyInput
} from 'dynamodb-toolbox/entity/actions/put'

type MyEntityInput = PutItemInput<typeof MyEntity>
type MyEntityKey = KeyInput<typeof MyEntity>
```

### Output Types

```typescript
import type { FormattedItem } from 'dynamodb-toolbox/entity'

type MyEntityItem = FormattedItem<typeof MyEntity>
```

### Schema Inference

```typescript
import type { InferSchema } from 'dynamodb-toolbox/schema'

const mySchema = item({ name: string(), age: number() })
type MySchemaType = InferSchema<typeof mySchema>
// { name: string, age: number }
```
