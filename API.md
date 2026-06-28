**agent-skills-ts-sdk**

***

# agent-skills-ts-sdk

## Classes

### ParseError

Error thrown during SKILL.md parsing (invalid YAML, missing frontmatter, etc.)

Used for:
- Missing or malformed frontmatter
- Invalid YAML syntax
- Non-mapping YAML structure
- Missing SKILL.md inputs in a host-provided file list

#### Param

**message**

Human-readable parse failure detail.

#### Example

```ts
throw new ParseError("SKILL.md must start with YAML frontmatter (---)")
```

#### See

 - https://agentskills.io/specification
 - https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/errors.py

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new ParseError**(`message`): [`ParseError`](#parseerror)

###### Parameters

###### message

`string`

###### Returns

[`ParseError`](#parseerror)

###### Overrides

`Error.constructor`

***

### ValidationError

Error thrown during skill validation (invalid name, missing fields, etc.)

Used for:
- Missing required fields (name, description)
- Invalid field formats (name not lowercase, etc.)
- Field length violations (name > 64 chars, description > 1024 chars, etc.)
- Unexpected frontmatter fields

#### Param

**message**

Human-readable validation failure detail.

#### Example

```ts
throw new ValidationError("Field 'name' must be a non-empty string")
```

#### See

 - https://agentskills.io/specification
 - https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/errors.py

#### Extends

- `Error`

#### Constructors

##### Constructor

> **new ValidationError**(`message`): [`ValidationError`](#validationerror)

###### Parameters

###### message

`string`

###### Returns

[`ValidationError`](#validationerror)

###### Overrides

`Error.constructor`

## Interfaces

### DisclosureInstructionOptions

Options for disclosure protocol instruction text generation.

#### Properties

##### toolName?

> `optional` **toolName?**: `string`

Tool name override used in generated instruction text.

***

### DisclosurePromptEntry

Prompt entry for resource-aware progressive disclosure hosts.

#### Extends

- [`SkillPromptEntry`](#skillpromptentry)

#### Properties

##### description

> **description**: `string`

Required skill description.

###### Inherited from

[`SkillPromptEntry`](#skillpromptentry).[`description`](#description-7)

##### location?

> `optional` **location?**: `string`

Host label such as a path, URL, or bundle location.

###### Inherited from

[`SkillPromptEntry`](#skillpromptentry).[`location`](#location-4)

##### name

> **name**: `string`

Required skill identifier.

###### Inherited from

[`SkillPromptEntry`](#skillpromptentry).[`name`](#name-8)

##### resources?

> `optional` **resources?**: `string`[]

Optional tier-3 resource names exposed as prompt hints.

***

### ParseFrontmatterOptions

Frontmatter parser options.

`strict` follows the specification and reference parser behavior exactly:
content must start with `---`.

`embedded` is an explicit host opt-in for web extraction contexts where
content may have a leading BOM or whitespace before frontmatter.

#### Properties

##### inputMode?

> `optional` **inputMode?**: [`ParseFrontmatterInputMode`](#parsefrontmatterinputmode)

Input handling mode.
- `strict` (default): parse exactly as provided.
- `embedded`: remove UTF-8 BOM and leading whitespace before strict parse.

***

### ReadSkillPropertiesOptions

Options for `readSkillProperties`.

#### Properties

##### location?

> `optional` **location?**: `string`

Optional label used in parse errors when `SKILL.md` is missing.

***

### ReadToolSchema

Format-agnostic read tool schema declaration.

This shape maps cleanly to Gemini `functionDeclarations`, OpenAI tools,
and MCP tool metadata.

#### Properties

##### description

> **description**: `string`

Human-readable tool description.

##### name

> **name**: `string`

Tool name for the declaration payload.

##### parametersJsonSchema

> **parametersJsonSchema**: `object`

JSON Schema object describing accepted arguments.

***

### ReadToolSchemaOptions

Options for building the read tool schema declaration.

#### Properties

##### description?

> `optional` **description?**: `string`

Tool description override.

##### toolName?

> `optional` **toolName?**: `string`

Tool name override (defaults to `read_skill`).

***

### ResolvedSkill

Full skill content returned by a source.

`ResolvedSkill` keeps the parsed frontmatter fields together with the
`SKILL.md` body and resource contents. It is pure data so browser, server,
CLI, and storage-backed hosts can share the same read/disclosure path.

#### Example

```ts
const skill: ResolvedSkill = {
  name: "pizza-maker",
  description: "Interactive pizza builder",
  body: "Use [build-pizza](references/build-pizza)",
  resources: [{ name: "build-pizza", path: "references/build-pizza", content: "..." }]
}
```

#### See

https://agentskills.io/specification

#### Extends

- [`SkillProperties`](#skillproperties)\<`TMetadata`\>

#### Type Parameters

##### TMetadata

`TMetadata` *extends* [`SkillMetadataMap`](#skillmetadatamap) = [`SkillMetadataMap`](#skillmetadatamap)

#### Properties

##### allowedTools?

> `optional` **allowedTools?**: `string`

Optional space-delimited allowed-tools declaration.

###### Inherited from

[`SkillProperties`](#skillproperties).[`allowedTools`](#allowedtools-3)

##### body

> **body**: `string`

Markdown body after frontmatter removal.

##### compatibility?

> `optional` **compatibility?**: `string`

Optional host/runtime compatibility notes.

###### Inherited from

[`SkillProperties`](#skillproperties).[`compatibility`](#compatibility-4)

##### description

> **description**: `string`

Required skill description.

###### Inherited from

[`SkillProperties`](#skillproperties).[`description`](#description-8)

##### license?

> `optional` **license?**: `string`

Optional license declaration.

###### Inherited from

[`SkillProperties`](#skillproperties).[`license`](#license-4)

##### location?

> `optional` **location?**: `string`

Host label such as a path, URL, or bundle location.

##### metadata?

> `optional` **metadata?**: `TMetadata`

Optional string metadata map.

###### Inherited from

[`SkillProperties`](#skillproperties).[`metadata`](#metadata-5)

##### name

> **name**: `string`

Required skill identifier.

###### Inherited from

[`SkillProperties`](#skillproperties).[`name`](#name-9)

##### resources

> **resources**: [`SkillResource`](#skillresource)[]

Resource files resolved from links in the skill body or by a host source.

***

### ResourceLink

Parsed resource reference discovered in a skill body markdown link.

#### Properties

##### name

> **name**: `string`

Display identifier from markdown link text.

##### path

> **path**: `string`

Canonical resource path under an observed skill-local resource directory.

***

### SkillContentEntry

Minimal in-memory representation of a file entry.

#### Example

```ts
const entry: SkillContentEntry = { name: "SKILL.md", content: "---\n...\n---" }
```

#### See

https://agentskills.io/specification

#### Properties

##### content

> **content**: `string`

File contents.

##### name

> **name**: `string`

File name (for example `SKILL.md`).

***

### SkillDescriptor

Catalog metadata returned by `SkillSource.list()`.

This is the prompt-facing view of a skill: enough for a model to decide
whether to read it, without loading the full `SKILL.md` body.

#### Extends

- `Pick`\<[`ResolvedSkill`](#resolvedskill), `"allowedTools"` \| `"compatibility"` \| `"description"` \| `"license"` \| `"location"` \| `"metadata"` \| `"name"`\>

#### Properties

##### allowedTools?

> `optional` **allowedTools?**: `string`

Optional space-delimited allowed-tools declaration.

###### Inherited from

`Pick.allowedTools`

##### compatibility?

> `optional` **compatibility?**: `string`

Optional host/runtime compatibility notes.

###### Inherited from

`Pick.compatibility`

##### description

> **description**: `string`

Required skill description.

###### Inherited from

`Pick.description`

##### license?

> `optional` **license?**: `string`

Optional license declaration.

###### Inherited from

`Pick.license`

##### location?

> `optional` **location?**: `string`

Host label such as a path, URL, or bundle location.

###### Inherited from

`Pick.location`

##### metadata?

> `optional` **metadata?**: [`SkillMetadataMap`](#skillmetadatamap)

Optional string metadata map.

###### Inherited from

`Pick.metadata`

##### name

> **name**: `string`

Required skill identifier.

###### Inherited from

`Pick.name`

##### resources?

> `optional` **resources?**: `string`[]

Resource names exposed as prompt hints; paths and contents stay behind `load()`.

##### sourceId?

> `optional` **sourceId?**: `string`

Source identifier. The registry fills this when a source omits it.

***

### SkillDiffSegment

Consecutive lines sharing the same diff operation type.

#### Example

```ts
const segment: SkillDiffSegment = { type: "equal", lines: ["line"] }
```

#### See

https://agentskills.io/specification

#### Properties

##### lines

> **lines**: `string`[]

##### type

> **type**: [`SkillDiffSegmentType`](#skilldiffsegmenttype-1)

***

### SkillFile

Full skill record suitable for storage in an app-owned persistence layer.

#### Example

```ts
const file: SkillFile = {
  id: "skill_1",
  content: "---\nname: demo\ndescription: Demo\n---",
  properties: { name: "demo", description: "Demo" },
  size: 42,
  createdAt: Date.now(),
  updatedAt: Date.now()
}
```

#### See

https://agentskills.io/specification

#### Type Parameters

##### TMetadata

`TMetadata` *extends* [`SkillMetadataMap`](#skillmetadatamap) = [`SkillMetadataMap`](#skillmetadatamap)

#### Properties

##### content

> **content**: `string`

Raw SKILL.md content.

##### createdAt

> **createdAt**: `number`

Record creation timestamp in milliseconds.

##### id

> **id**: `string`

Host-owned unique skill id.

##### properties

> **properties**: [`SkillProperties`](#skillproperties)\<`TMetadata`\>

Parsed skill properties.

##### size

> **size**: `number`

Content byte size.

##### updatedAt

> **updatedAt**: `number`

Record update timestamp in milliseconds.

***

### SkillFrontmatter

Frontmatter shape as defined by the spec.
Required: name, description.
Optional: license, compatibility, allowed-tools, metadata.

#### Example

```ts
const frontmatter: SkillFrontmatter = {
  name: "demo-skill",
  description: "Demonstrates the format",
  "allowed-tools": "Bash(git:*)"
}
```

#### See

 - https://agentskills.io/specification
 - https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/models.py

#### Type Parameters

##### TMetadata

`TMetadata` *extends* [`SkillMetadataMap`](#skillmetadatamap) = [`SkillMetadataMap`](#skillmetadatamap)

#### Properties

##### allowed-tools?

> `optional` **allowed-tools?**: `string`

Optional space-delimited allowed-tools declaration.

##### compatibility?

> `optional` **compatibility?**: `string`

Optional host/runtime compatibility notes.

##### description

> **description**: `string`

Required skill description.

##### license?

> `optional` **license?**: `string`

Optional license declaration.

##### metadata?

> `optional` **metadata?**: `TMetadata`

Optional string metadata map.

##### name

> **name**: `string`

Required skill identifier.

***

### SkillFrontmatterParseResult

Result returned by `parseFrontmatter`.

#### Example

```ts
const result: SkillFrontmatterParseResult = {
  metadata: { name: "demo", description: "Demo" },
  body: "# Instructions"
}
```

#### See

https://agentskills.io/specification

#### Type Parameters

##### TMetadata

`TMetadata` *extends* [`SkillMetadataMap`](#skillmetadatamap) = [`SkillMetadataMap`](#skillmetadatamap)

#### Properties

##### body

> **body**: `string`

Markdown body after frontmatter removal.

##### metadata

> **metadata**: [`SkillFrontmatter`](#skillfrontmatter)\<`TMetadata`\>

Parsed spec-keyed frontmatter object.

***

### SkillLineDiff

Line-oriented diff output.

#### Example

```ts
const diff: SkillLineDiff = diffSkillContent("a", "b")
```

#### See

https://agentskills.io/specification

#### Properties

##### baseLineCount

> **baseLineCount**: `number`

##### segments

> **segments**: [`SkillDiffSegment`](#skilldiffsegment)[]

##### updatedLineCount

> **updatedLineCount**: `number`

***

### SkillMetadata

Lightweight metadata for progressive disclosure.
Used in list views and skill selection UI.

Progressive disclosure strategy:
1. Metadata (roughly 50-100 tokens): name + description loaded at startup
2. Full content (roughly 500-5000 tokens): loaded when activated

#### Example

```ts
const metadata: SkillMetadata = {
  id: "skill_1",
  name: "demo",
  description: "Demo skill",
  metadataTokens: 80,
  fullTokens: 900,
  createdAt: Date.now(),
  updatedAt: Date.now()
}
```

#### See

https://agentskills.io/specification

#### Type Parameters

##### TMetadata

`TMetadata` *extends* [`SkillMetadataMap`](#skillmetadatamap) = [`SkillMetadataMap`](#skillmetadatamap)

#### Properties

##### allowedTools?

> `optional` **allowedTools?**: `string`

Optional space-delimited allowed-tools declaration.

##### compatibility?

> `optional` **compatibility?**: `string`

Optional host/runtime compatibility notes.

##### createdAt

> **createdAt**: `number`

Record creation timestamp in milliseconds.

##### description

> **description**: `string`

Skill description.

##### fullTokens

> **fullTokens**: `number`

Estimated token size for full skill content.

##### id

> **id**: `string`

Host-owned unique skill id.

##### license?

> `optional` **license?**: `string`

Optional license declaration.

##### metadata?

> `optional` **metadata?**: `TMetadata`

Optional string metadata map.

##### metadataTokens

> **metadataTokens**: `number`

Estimated token size for metadata-only tier.

##### name

> **name**: `string`

Skill identifier.

##### updatedAt

> **updatedAt**: `number`

Record update timestamp in milliseconds.

***

### SkillParseResult

Result returned by `parseSkillContent`.

#### Example

```ts
const result: SkillParseResult = {
  properties: { name: "demo", description: "Demo" },
  body: "# Instructions"
}
```

#### See

https://agentskills.io/specification

#### Type Parameters

##### TMetadata

`TMetadata` *extends* [`SkillMetadataMap`](#skillmetadatamap) = [`SkillMetadataMap`](#skillmetadatamap)

#### Properties

##### body

> **body**: `string`

Markdown body after frontmatter removal.

##### properties

> **properties**: [`SkillProperties`](#skillproperties)\<`TMetadata`\>

Parsed camel-cased properties for JS usage.

***

### SkillPatch

Top-level patch payload accepted by `applySkillPatch`.

#### Example

```ts
const patch: SkillPatch = { version: 1, operations: [] }
```

#### See

https://agentskills.io/specification

#### Properties

##### operations

> **operations**: [`SkillPatchOperation`](#skillpatchoperation)[]

##### version

> **version**: `1`

***

### SkillPatchApplyOptions

Options for patch application behavior.

#### Example

```ts
const options: SkillPatchApplyOptions = { expectedMatches: 1, validate: true }
```

#### See

https://agentskills.io/specification

#### Properties

##### expectedMatches?

> `optional` **expectedMatches?**: `number`

##### validate?

> `optional` **validate?**: `boolean` \| [`ValidateSkillPropertiesOptions`](#validateskillpropertiesoptions)

***

### SkillPatchApplyResult

Result returned by `applySkillPatch`.

#### Example

```ts
const result: SkillPatchApplyResult = applySkillPatch(content, patch)
```

#### See

https://agentskills.io/specification

#### Properties

##### appliedOperations?

> `optional` **appliedOperations?**: `number`

##### content?

> `optional` **content?**: `string`

##### errors?

> `optional` **errors?**: [`SkillPatchIssue`](#skillpatchissue)[]

##### ok

> **ok**: `boolean`

***

### SkillPatchCreateOptions

Options for `createSkillPatch`.

#### Example

```ts
const options: SkillPatchCreateOptions = { contextLines: 2 }
```

#### See

https://agentskills.io/specification

#### Properties

##### contextLines?

> `optional` **contextLines?**: `number`

***

### SkillPatchDeleteOperation

Delete operation that removes occurrences of target text.

#### Example

```ts
const op: SkillPatchDeleteOperation = { type: "delete", before: "obsolete" }
```

#### See

https://agentskills.io/specification

#### Properties

##### before

> **before**: `string`

##### expectedMatches?

> `optional` **expectedMatches?**: `number`

##### type

> **type**: `"delete"`

***

### SkillPatchInsertOperation

Insert operation that adds text before or after an anchor.

#### Example

```ts
const op: SkillPatchInsertOperation = {
  type: "insert",
  anchor: "## Section",
  text: "\nNew line",
  position: "after"
}
```

#### See

https://agentskills.io/specification

#### Properties

##### anchor

> **anchor**: `string`

##### expectedMatches?

> `optional` **expectedMatches?**: `number`

##### position?

> `optional` **position?**: `"before"` \| `"after"`

##### text

> **text**: `string`

##### type

> **type**: `"insert"`

***

### SkillPatchIssue

Structured issue detail for patch failures.

#### Example

```ts
const issue: SkillPatchIssue = {
  code: "OPERATION_TARGET_NOT_FOUND",
  message: "Target text not found."
}
```

#### See

https://agentskills.io/specification

#### Properties

##### code

> **code**: [`SkillPatchIssueCode`](#skillpatchissuecode-1)

##### expectedMatches?

> `optional` **expectedMatches?**: `number`

##### field?

> `optional` **field?**: `string`

##### matchCount?

> `optional` **matchCount?**: `number`

##### message

> **message**: `string`

##### operationIndex?

> `optional` **operationIndex?**: `number`

##### operationType?

> `optional` **operationType?**: [`SkillPatchOperationType`](#skillpatchoperationtype)

##### snippet?

> `optional` **snippet?**: `string`

***

### SkillPatchReplaceOperation

Replace operation that swaps matched text with new text.

#### Example

```ts
const op: SkillPatchReplaceOperation = {
  type: "replace",
  before: "old",
  after: "new"
}
```

#### See

https://agentskills.io/specification

#### Properties

##### after

> **after**: `string`

##### before

> **before**: `string`

##### expectedMatches?

> `optional` **expectedMatches?**: `number`

##### type

> **type**: `"replace"`

***

### SkillPatchValidationResult

Result returned by `validateSkillPatch`.

#### Example

```ts
const result: SkillPatchValidationResult = validateSkillPatch(candidate)
```

#### See

https://agentskills.io/specification

#### Properties

##### errors?

> `optional` **errors?**: [`SkillPatchIssue`](#skillpatchissue)[]

##### ok

> **ok**: `boolean`

##### patch?

> `optional` **patch?**: [`SkillPatch`](#skillpatch)

***

### SkillPromptEntry

Prompt-ready skill metadata.

This shape is storage-agnostic and works for both filesystem hosts
(with `location`) and tool-only hosts (without `location`).

#### See

 - https://agentskills.io/specification
 - https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/prompt.py

#### Extends

- `Pick`\<[`ResolvedSkill`](#resolvedskill), `"name"` \| `"description"` \| `"location"`\>

#### Extended by

- [`DisclosurePromptEntry`](#disclosurepromptentry)

#### Properties

##### description

> **description**: `string`

Required skill description.

###### Inherited from

`Pick.description`

##### location?

> `optional` **location?**: `string`

Host label such as a path, URL, or bundle location.

###### Inherited from

`Pick.location`

##### name

> **name**: `string`

Required skill identifier.

###### Inherited from

`Pick.name`

***

### SkillPromptSource

SKILL.md source data for prompt generation.

#### See

 - https://agentskills.io/specification
 - https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/prompt.py

#### Properties

##### content

> **content**: `string`

Raw SKILL.md content to parse for prompt metadata.

##### location?

> `optional` **location?**: `string`

Optional source location label for prompt output.

***

### SkillProperties

Frontmatter normalized for JavaScript usage.
Matches the reference implementation semantics with camel-cased keys.

#### Example

```ts
const props: SkillProperties = {
  name: "demo",
  description: "Demo",
  allowedTools: "Read"
}
```

#### See

 - https://agentskills.io/specification
 - https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/models.py

#### Extended by

- [`ResolvedSkill`](#resolvedskill)

#### Type Parameters

##### TMetadata

`TMetadata` *extends* [`SkillMetadataMap`](#skillmetadatamap) = [`SkillMetadataMap`](#skillmetadatamap)

#### Properties

##### allowedTools?

> `optional` **allowedTools?**: `string`

Optional space-delimited allowed-tools declaration.

##### compatibility?

> `optional` **compatibility?**: `string`

Optional host/runtime compatibility notes.

##### description

> **description**: `string`

Required skill description.

##### license?

> `optional` **license?**: `string`

Optional license declaration.

##### metadata?

> `optional` **metadata?**: `TMetadata`

Optional string metadata map.

##### name

> **name**: `string`

Required skill identifier.

***

### SkillReadArgs

Tool call arguments for skill progressive disclosure reads.

#### Properties

##### name

> **name**: `string`

Skill identifier from the current skill set.

##### resource?

> `optional` **resource?**: `string`

Optional resource identifier within the selected skill.

***

### SkillReadError

Machine-readable read failure for hosts and UIs.

#### Properties

##### code

> **code**: [`SkillReadErrorCode`](#skillreaderrorcode-1)

Machine-readable error code for host-side branching.

##### error

> **error**: `string`

Human-readable error message.

##### ok

> **ok**: `false`

Indicates that the read failed.

***

### SkillReadResult

Successful result from a skill read request.

#### Properties

##### content

> **content**: `string`

Skill body or resource content returned by the read.

##### ok

> **ok**: `true`

Indicates that the read resolved successfully.

***

### SkillRegistry

Loaded catalog over ordered skill sources.

Source order is precedence: the first source to list a skill name owns reads
for that name, and later duplicates are ignored with a warning. Listing and
refresh failures are recorded in `warnings` instead of failing the whole
registry.

#### Properties

##### fingerprint

> `readonly` **fingerprint**: `string`

Combined `${source.id}:${source.fingerprint}` value for the loaded sources.

##### warnings

> `readonly` **warnings**: `string`[]

Non-fatal diagnostics from the most recent load or refresh.

#### Methods

##### loadSkill()

> **loadSkill**(`name`): `Promise`\<[`ResolvedSkill`](#resolvedskill)\<[`SkillMetadataMap`](#skillmetadatamap)\> \| `null`\>

Load full content from the source that owns `name`, or `null` when absent.

###### Parameters

###### name

`string`

###### Returns

`Promise`\<[`ResolvedSkill`](#resolvedskill)\<[`SkillMetadataMap`](#skillmetadatamap)\> \| `null`\>

##### read()

> **read**(`args`): `Promise`\<[`SkillReadResult`](#skillreadresult) \| [`SkillReadError`](#skillreaderror)\>

Handle a progressive disclosure read against the source that owns `args.name`.

###### Parameters

###### args

[`SkillReadArgs`](#skillreadargs)

###### Returns

`Promise`\<[`SkillReadResult`](#skillreadresult) \| [`SkillReadError`](#skillreaderror)\>

##### readTool()

> **readTool**(`options?`): [`ReadToolSchema`](#readtoolschema)

Return a strict JSON Schema read-tool declaration for the current catalog.

###### Parameters

###### options?

[`ReadToolSchemaOptions`](#readtoolschemaoptions)

###### Returns

[`ReadToolSchema`](#readtoolschema)

##### refresh()

> **refresh**(): `Promise`\<`void`\>

Call each source's `refresh()` hook, then rebuild the catalog.

###### Returns

`Promise`\<`void`\>

##### snapshot()

> **snapshot**(`options?`): [`SkillRegistrySnapshot`](#skillregistrysnapshot-1)

Return the current catalog fingerprint and prompt in one object.

###### Parameters

###### options?

[`DisclosureInstructionOptions`](#disclosureinstructionoptions)

###### Returns

[`SkillRegistrySnapshot`](#skillregistrysnapshot-1)

##### systemPrompt()

> **systemPrompt**(`options?`): `string` \| `null`

Return disclosure instructions and `<available_skills>`, or `null` when empty.

###### Parameters

###### options?

[`DisclosureInstructionOptions`](#disclosureinstructionoptions)

###### Returns

`string` \| `null`

***

### SkillRegistrySnapshot

Point-in-time catalog state for prompt caching or host diagnostics.

#### Properties

##### catalogPrompt

> **catalogPrompt**: `string` \| `null`

Disclosure instructions and `<available_skills>`, or `null` when empty.

##### fingerprint

> **fingerprint**: `string`

Combined `${source.id}:${source.fingerprint}` value for the loaded sources.

***

### SkillResource

A single tier-3 resource associated with a skill.

Resources are loaded on demand by the host and can originate from
`scripts/`, `references/`, or `assets/`.

#### Example

```ts
const resource: SkillResource = {
  name: "build-pizza",
  path: "references/build-pizza",
  content: "# Build Pizza\n..."
}
```

#### See

https://agentskills.io/specification

#### Properties

##### content

> **content**: `string`

Raw resource file contents.

##### name

> **name**: `string`

Resource identifier used by read handlers/tool calls.

##### path

> **path**: `string`

Relative resource path from skill root.

***

### SkillSource

Storage adapter for Agent Skills.

The shape follows Cloudflare Agents SDK's `SkillSource`: `list()` exposes the
catalog, `load()` returns full content, and `refresh()` lets live stores update
before the registry rebuilds. This SDK keeps `load()` on the existing
`ResolvedSkill` model instead of Cloudflare's `SkillContent`.

#### See

https://github.com/cloudflare/agents/blob/main/packages/agents/src/skills/types.ts

#### Properties

##### fingerprint

> **fingerprint**: `string`

Host version marker. Change it when catalog entries or loaded content change.

##### id

> **id**: `string`

Stable key used in registry fingerprints, warnings, and duplicate diagnostics.

#### Methods

##### list()

> **list**(): `Promise`\<[`SkillDescriptor`](#skilldescriptor)[]\>

Return catalog metadata without loading full skill bodies.

###### Returns

`Promise`\<[`SkillDescriptor`](#skilldescriptor)[]\>

##### load()

> **load**(`name`): `Promise`\<[`ResolvedSkill`](#resolvedskill)\<[`SkillMetadataMap`](#skillmetadatamap)\> \| `null`\>

Load full skill content, or `null` when this source does not own `name`.

###### Parameters

###### name

`string`

###### Returns

`Promise`\<[`ResolvedSkill`](#resolvedskill)\<[`SkillMetadataMap`](#skillmetadatamap)\> \| `null`\>

##### readResource()?

> `optional` **readResource**(`name`, `path`): `Promise`\<[`SkillResource`](#skillresource) \| `null`\>

Optional fast path for hosts that can fetch one resource without loading the skill.

###### Parameters

###### name

`string`

###### path

`string`

###### Returns

`Promise`\<[`SkillResource`](#skillresource) \| `null`\>

##### refresh()?

> `optional` **refresh**(): `Promise`\<`void`\>

Refresh live backing storage before the registry lists skills again.

###### Returns

`Promise`\<`void`\>

***

### SkillSourceFromEntriesOptions

Options for `skillSourceFromEntries()`.

#### Properties

##### fingerprint?

> `optional` **fingerprint?**: `string`

Explicit source fingerprint. Defaults to a stable hash of file names and contents.

##### id?

> `optional` **id?**: `string`

Source id used in registry fingerprints and warnings. Defaults to `entries`.

##### location?

> `optional` **location?**: `string`

Host label attached to the resolved skill and prompt catalog.

***

### SkillValidationOptions

Host-provided context for validating in-memory skill entries.

#### Example

```ts
const options: SkillValidationOptions = {
  location: "/skills/demo",
  expectedName: "demo",
  exists: true,
  isDirectory: true
}
```

#### See

 - https://agentskills.io/specification
 - https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/validator.py

#### Properties

##### exists?

> `optional` **exists?**: `boolean`

Whether the host path exists.

##### expectedName?

> `optional` **expectedName?**: `string`

Expected skill name (for example, directory or slug match).

##### isDirectory?

> `optional` **isDirectory?**: `boolean`

Whether the host path is a directory.

##### location?

> `optional` **location?**: `string`

Optional location label included in error messages.

***

### ValidateSkillPropertiesOptions

Optional host-level constraints for `validateSkillProperties`.

#### Properties

##### expectedName?

> `optional` **expectedName?**: `string`

Expected skill name (for example, directory or slug match).

## Type Aliases

### ByteCount

> **ByteCount** = `number`

Byte count for persisted skill content.

#### Example

```ts
const size: ByteCount = 2048
```

#### See

https://agentskills.io/specification

***

### ParseFrontmatterInputMode

> **ParseFrontmatterInputMode** = `"strict"` \| `"embedded"`

Supported parse modes for frontmatter input handling.

***

### SkillAllowedTools

> **SkillAllowedTools** = `string`

Space-delimited tool allowlist string (`allowed-tools` in frontmatter).

#### Example

```ts
const allowed: SkillAllowedTools = "Bash(git:*) Read"
```

#### See

https://agentskills.io/specification

***

### SkillBody

> **SkillBody** = `string`

Markdown body content after frontmatter is removed.

#### Example

```ts
const body: SkillBody = "# Instructions"
```

#### See

https://agentskills.io/specification

***

### SkillContent

> **SkillContent** = `string`

Raw `SKILL.md` file content.

#### Example

```ts
const content: SkillContent = "---\nname: demo\ndescription: Demo\n---\n# Body"
```

#### See

https://agentskills.io/specification

***

### SkillDiffSegmentType

> **SkillDiffSegmentType** = `"equal"` \| `"insert"` \| `"delete"`

Diff segment type.

#### Example

```ts
const type: SkillDiffSegmentType = "insert"
```

#### See

https://agentskills.io/specification

***

### SkillFrontmatterKey

> **SkillFrontmatterKey** = *typeof* [`SKILL_FRONTMATTER_KEYS`](#skill_frontmatter_keys)\[`number`\]

Union of allowed frontmatter keys.

#### Example

```ts
const key: SkillFrontmatterKey = "allowed-tools"
```

#### See

https://agentskills.io/specification

***

### SkillId

> **SkillId** = `string`

Stable identifier for a stored skill record.

#### Example

```ts
const id: SkillId = "skill_123"
```

#### See

https://agentskills.io/specification

***

### SkillMetadataMap

> **SkillMetadataMap** = `Record`\<`string`, `string`\>

String key-value metadata map from frontmatter.

#### Example

```ts
const metadata: SkillMetadataMap = { author: "example-org", version: "1.0" }
```

#### See

https://agentskills.io/specification

***

### SkillPatchIssueCode

> **SkillPatchIssueCode** = `"PATCH_NOT_OBJECT"` \| `"PATCH_INVALID_VERSION"` \| `"PATCH_MISSING_OPERATIONS"` \| `"OPERATION_INVALID"` \| `"OPERATION_TARGET_EMPTY"` \| `"OPERATION_INVALID_POSITION"` \| `"OPERATION_INVALID_EXPECTED_MATCHES"` \| `"OPERATION_TARGET_NOT_FOUND"` \| `"OPERATION_TARGET_AMBIGUOUS"` \| `"OPERATION_MATCH_COUNT_MISMATCH"` \| `"SKILL_INVALID"`

Machine-readable issue codes emitted by patch validation/application.

#### Example

```ts
const code: SkillPatchIssueCode = "OPERATION_TARGET_NOT_FOUND"
```

#### See

https://agentskills.io/specification

***

### SkillPatchOperation

> **SkillPatchOperation** = [`SkillPatchReplaceOperation`](#skillpatchreplaceoperation) \| [`SkillPatchInsertOperation`](#skillpatchinsertoperation) \| [`SkillPatchDeleteOperation`](#skillpatchdeleteoperation)

Union of all supported patch operations.

#### Example

```ts
const op: SkillPatchOperation = { type: "delete", before: "obsolete" }
```

#### See

https://agentskills.io/specification

***

### SkillPatchOperationType

> **SkillPatchOperationType** = `"replace"` \| `"insert"` \| `"delete"`

Supported patch operation types.

#### Example

```ts
const type: SkillPatchOperationType = "replace"
```

#### See

https://agentskills.io/specification

***

### SkillReadErrorCode

> **SkillReadErrorCode** = `"INVALID_ARGUMENT"` \| `"SKILL_NOT_FOUND"` \| `"RESOURCE_NOT_FOUND"`

Stable error codes for progressive disclosure read failures.

***

### SkillTokenCount

> **SkillTokenCount** = `number`

Token count estimate used for progressive disclosure.

#### Example

```ts
const tokens: SkillTokenCount = 120
```

#### See

https://agentskills.io/specification

***

### UnixMillis

> **UnixMillis** = `number`

Unix timestamp in milliseconds.

#### Example

```ts
const updatedAt: UnixMillis = Date.now()
```

#### See

https://agentskills.io/specification

## Variables

### ALLOWED\_FIELDS

> `const` **ALLOWED\_FIELDS**: `Set`\<`string`\>

Allowed frontmatter fields per Agent Skills Spec.
https://agentskills.io/specification

#### Example

```ts
if (!ALLOWED_FIELDS.has("name")) {
  throw new Error("configuration bug")
}
```

#### See

 - https://agentskills.io/specification
 - https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/validator.py

***

### MAX\_COMPATIBILITY\_LENGTH

> `const` **MAX\_COMPATIBILITY\_LENGTH**: `500` = `500`

Maximum allowed compatibility string length.

#### See

https://agentskills.io/specification

#### Example

```ts
if (compatibility.length > MAX_COMPATIBILITY_LENGTH) {
  // invalid
}
```

***

### MAX\_DESCRIPTION\_LENGTH

> `const` **MAX\_DESCRIPTION\_LENGTH**: `1024` = `1024`

Maximum allowed description length.

#### See

https://agentskills.io/specification

#### Example

```ts
if (description.length > MAX_DESCRIPTION_LENGTH) {
  // invalid
}
```

***

### MAX\_SKILL\_NAME\_LENGTH

> `const` **MAX\_SKILL\_NAME\_LENGTH**: `64` = `64`

Maximum allowed skill name length.

#### See

https://agentskills.io/specification

#### Example

```ts
if (name.length > MAX_SKILL_NAME_LENGTH) {
  // invalid
}
```

***

### SKILL\_FRONTMATTER\_KEYS

> `const` **SKILL\_FRONTMATTER\_KEYS**: readonly \[`"name"`, `"description"`, `"license"`, `"compatibility"`, `"allowed-tools"`, `"metadata"`\]

Canonical frontmatter keys accepted by the spec.

#### Example

```ts
for (const key of SKILL_FRONTMATTER_KEYS) {
  console.log(key)
}
```

#### See

https://agentskills.io/specification

## Functions

### applySkillPatch()

> **applySkillPatch**(`content`, `patch`, `options?`): [`SkillPatchApplyResult`](#skillpatchapplyresult)

Applies a patch to SKILL.md content with optional post-validation.

#### Parameters

##### content

`string`

Existing SKILL.md content.

##### patch

`unknown`

Candidate patch payload (typed or untyped).

##### options?

[`SkillPatchApplyOptions`](#skillpatchapplyoptions) = `{}`

Apply options for validation and expected match counts.

#### Returns

[`SkillPatchApplyResult`](#skillpatchapplyresult)

Structured apply result with updated content or issues.

#### Example

```ts
const result = applySkillPatch(content, {
  version: 1,
  operations: [{ type: "replace", before: "old", after: "new" }]
})
```

#### See

https://agentskills.io/specification

***

### createSkillPatch()

> **createSkillPatch**(`base`, `updated`, `options?`): [`SkillPatch`](#skillpatch)

Creates a contextual replace patch from base and updated content.

#### Parameters

##### base

`string`

Original SKILL.md content.

##### updated

`string`

Updated SKILL.md content.

##### options?

[`SkillPatchCreateOptions`](#skillpatchcreateoptions) = `{}`

Patch generation options.

#### Returns

[`SkillPatch`](#skillpatch)

Patch payload containing replace operations.

#### Example

```ts
const patch = createSkillPatch(baseContent, updatedContent, { contextLines: 2 })
```

#### See

https://agentskills.io/specification

***

### createSkillRegistry()

> **createSkillRegistry**(`sources`): `Promise`\<[`SkillRegistry`](#skillregistry)\>

Create a registry and eagerly list its sources.

The returned registry is ready to build prompts, expose the read tool schema,
and service read calls without a separate initialization step.

#### Parameters

##### sources

[`SkillSource`](#skillsource)[]

#### Returns

`Promise`\<[`SkillRegistry`](#skillregistry)\>

***

### diffSkillContent()

> **diffSkillContent**(`base`, `updated`): [`SkillLineDiff`](#skilllinediff)

Computes a line-based diff between two SKILL.md contents.

#### Parameters

##### base

`string`

Original SKILL.md content.

##### updated

`string`

Updated SKILL.md content.

#### Returns

[`SkillLineDiff`](#skilllinediff)

Grouped line diff segments.

#### Example

```ts
const diff = diffSkillContent(baseContent, updatedContent)
```

#### See

https://agentskills.io/specification

***

### estimateTokens()

> **estimateTokens**(`text`): `number`

Estimate token count for text.
Uses rough approximation: ~1 token per 4 characters.

This is intentionally simple and conservative. For production,
consider using a proper tokenizer like tiktoken or @anthropic-ai/tokenizer.

The 4-character heuristic tends to overestimate slightly, which is safer
for context limits than underestimating.

#### Parameters

##### text

`string`

Text to estimate tokens for

#### Returns

`number`

Estimated token count

#### Example

```ts
const tokens = estimateTokens("Hello world")
```

#### See

https://agentskills.io/specification

***

### extractBody()

> **extractBody**(`content`): `string`

Extract markdown body from SKILL.md content (strips frontmatter).

#### Parameters

##### content

`string`

Raw content of SKILL.md file

#### Returns

`string`

Markdown body without frontmatter

#### Example

```ts
const body = extractBody(`---\nname: demo\ndescription: Demo\n---\n# Body`)
```

#### See

 - https://agentskills.io/specification
 - https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/parser.py

If content doesn't have valid frontmatter, returns the content as-is.

***

### extractResourceLinks()

> **extractResourceLinks**(`body`): [`ResourceLink`](#resourcelink)[]

Extracts tier-3 resource links from skill body markdown.

Only links to observed skill-local resource directories are returned.
External URLs, anchors, and path traversal references are ignored.
Leading `./` is accepted and normalized away.

#### Parameters

##### body

`string`

Skill markdown body (without frontmatter).

#### Returns

[`ResourceLink`](#resourcelink)[]

De-duplicated list of resource links.

***

### findSkillMdFile()

> **findSkillMdFile**\<`T`\>(`files`): `T` \| `null`

Finds SKILL.md in a list of file entries, preferring uppercase over lowercase.

#### Type Parameters

##### T

`T` *extends* `Pick`\<[`SkillContentEntry`](#skillcontententry), `"name"`\>

#### Parameters

##### files

`Iterable`\<`T`\>

File entries from any storage backend.

#### Returns

`T` \| `null`

The selected `SKILL.md` entry, or `null` when not found.

#### Example

```ts
const entry = findSkillMdFile([
  { name: "skill.md", content: "..." },
  { name: "SKILL.md", content: "..." }
])
```

#### See

 - https://agentskills.io/specification
 - https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/parser.py

***

### frontmatterToProperties()

> **frontmatterToProperties**\<`TMetadata`\>(`metadata`): [`SkillProperties`](#skillproperties)\<`TMetadata`\>

Converts hyphenated frontmatter keys into a JS-friendly properties shape.

#### Type Parameters

##### TMetadata

`TMetadata` *extends* [`SkillMetadataMap`](#skillmetadatamap) = [`SkillMetadataMap`](#skillmetadatamap)

#### Parameters

##### metadata

[`SkillFrontmatter`](#skillfrontmatter)\<`TMetadata`\>

Parsed frontmatter using spec keys.

#### Returns

[`SkillProperties`](#skillproperties)\<`TMetadata`\>

Camel-cased `SkillProperties` representation.

#### Example

```ts
const properties = frontmatterToProperties({
  name: "demo",
  description: "Demo skill",
  "allowed-tools": "Bash(git:*)"
})
```

#### See

 - https://agentskills.io/specification
 - https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/models.py

***

### handleSkillRead()

> **handleSkillRead**(`skills`, `args`): [`SkillReadResult`](#skillreadresult) \| [`SkillReadError`](#skillreaderror)

Handles a 2-level progressive disclosure read.

- `name` only: returns skill body (tier 2)
- `name` + `resource`: returns resource content (tier 3)

#### Parameters

##### skills

readonly [`ResolvedSkill`](#resolvedskill)\<[`SkillMetadataMap`](#skillmetadatamap)\>[]

Fully resolved in-memory skills.

##### args

[`SkillReadArgs`](#skillreadargs)

Read request arguments from a tool call or trusted caller.

#### Returns

[`SkillReadResult`](#skillreadresult) \| [`SkillReadError`](#skillreaderror)

Structured success or failure payload.

***

### normalizeNFKC()

> **normalizeNFKC**(`str`): `string`

Normalize string using NFKC (Normalization Form Compatibility Composition).
Matches Python's unicodedata.normalize("NFKC", str) behavior.

NFKC normalization:
- Decomposes characters into their base form
- Then recomposes them into the composed form
- Example: "café" with combining accent becomes "café" with precomposed é

This is critical for i18n support and consistent validation across platforms.

#### Parameters

##### str

`string`

Input string to normalize.

#### Returns

`string`

NFKC-normalized string.

#### Example

```ts
const normalized = normalizeNFKC("cafe\u0301")
```

#### See

 - https://agentskills.io/specification
 - https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/validator.py

***

### parseFrontmatter()

> **parseFrontmatter**\<`TMetadata`\>(`content`, `options?`): [`SkillFrontmatterParseResult`](#skillfrontmatterparseresult)\<`TMetadata`\>

Parse YAML frontmatter from SKILL.md content.

#### Type Parameters

##### TMetadata

`TMetadata` *extends* [`SkillMetadataMap`](#skillmetadatamap) = [`SkillMetadataMap`](#skillmetadatamap)

#### Parameters

##### content

`string`

Raw content of SKILL.md file

##### options?

[`ParseFrontmatterOptions`](#parsefrontmatteroptions) = `{}`

Optional parsing mode. Defaults to strict spec behavior.

#### Returns

[`SkillFrontmatterParseResult`](#skillfrontmatterparseresult)\<`TMetadata`\>

Parsed frontmatter metadata and trimmed markdown body.

#### Throws

If frontmatter is missing or invalid

#### Throws

If required fields are missing or invalid

#### Example

```ts
const { metadata, body } = parseFrontmatter(`---
name: demo
description: Demo skill
---
# Instructions`)
```

#### See

 - https://agentskills.io/specification
 - https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/parser.py

Spec: https://agentskills.io/specification
- File must start with `---`
- Frontmatter must be closed with second `---`
- YAML must be valid mapping (object)
- Required fields: name, description
- Required fields must be non-empty strings

***

### parseSkillContent()

> **parseSkillContent**\<`TMetadata`\>(`content`, `options?`): [`SkillParseResult`](#skillparseresult)\<`TMetadata`\>

Parse SKILL.md content into SkillProperties.

#### Type Parameters

##### TMetadata

`TMetadata` *extends* [`SkillMetadataMap`](#skillmetadatamap) = [`SkillMetadataMap`](#skillmetadatamap)

#### Parameters

##### content

`string`

Raw content of SKILL.md file

##### options?

[`ParseFrontmatterOptions`](#parsefrontmatteroptions) = `{}`

Optional frontmatter parsing mode.

#### Returns

[`SkillParseResult`](#skillparseresult)\<`TMetadata`\>

SkillProperties with parsed metadata and body

#### Throws

If SKILL.md has invalid format

#### Throws

If required fields are missing

#### Example

```ts
const parsed = parseSkillContent(`---
name: demo
description: Demo skill
---
# Instructions`)
```

#### See

 - https://agentskills.io/specification
 - https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/parser.py

Spec: https://agentskills.io/specification

***

### readSkillProperties()

> **readSkillProperties**\<`T`, `TMetadata`\>(`files`, `options?`): [`SkillProperties`](#skillproperties)\<`TMetadata`\>

Reads and parses the SKILL.md content from an in-memory file list.
The lookup mirrors the reference behavior by preferring SKILL.md over skill.md.

#### Type Parameters

##### T

`T` *extends* [`SkillContentEntry`](#skillcontententry)

##### TMetadata

`TMetadata` *extends* [`SkillMetadataMap`](#skillmetadatamap) = [`SkillMetadataMap`](#skillmetadatamap)

#### Parameters

##### files

`Iterable`\<`T`\>

File entries that may contain `SKILL.md`.

##### options?

[`ReadSkillPropertiesOptions`](#readskillpropertiesoptions) = `{}`

Optional location label for parse errors.

#### Returns

[`SkillProperties`](#skillproperties)\<`TMetadata`\>

Parsed `SkillProperties`.

#### Throws

If `SKILL.md` cannot be located.

#### Throws

If required frontmatter fields are missing or invalid.

#### Example

```ts
const properties = readSkillProperties([
  { name: "SKILL.md", content: "---\nname: demo\ndescription: Demo\n---" }
])
```

#### See

 - https://agentskills.io/specification
 - https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/parser.py

***

### skillPropertiesToDict()

> **skillPropertiesToDict**\<`TMetadata`\>(`props`): [`SkillFrontmatter`](#skillfrontmatter)\<`TMetadata`\>

Convert SkillProperties to dictionary, excluding null/undefined values.
Matches Python reference implementation's to_dict() behavior.

Note: `allowedTools` becomes `allowed-tools` with hyphen
Empty metadata object is excluded

#### Type Parameters

##### TMetadata

`TMetadata` *extends* [`SkillMetadataMap`](#skillmetadatamap) = [`SkillMetadataMap`](#skillmetadatamap)

#### Parameters

##### props

[`SkillProperties`](#skillproperties)\<`TMetadata`\>

JavaScript-friendly skill properties.

#### Returns

[`SkillFrontmatter`](#skillfrontmatter)\<`TMetadata`\>

Spec-keyed frontmatter dictionary.

#### Example

```ts
const dict = skillPropertiesToDict({
  name: "demo",
  description: "Demo skill",
  allowedTools: "Read"
})
// => { name: "demo", description: "Demo skill", "allowed-tools": "Read" }
```

#### See

 - https://agentskills.io/specification
 - https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/models.py

***

### skillSourceFromEntries()

> **skillSourceFromEntries**(`files`, `options?`): [`SkillSource`](#skillsource)

Create a static source from one `SKILL.md` file plus optional referenced files.

Resource entries are inferred from markdown links in the skill body. A linked
resource is included only when an entry with the same relative path exists.
The default fingerprint is order-independent so callers can pass filesystem,
ZIP, or database results without sorting first.

#### Parameters

##### files

`Iterable`\<[`SkillContentEntry`](#skillcontententry)\>

##### options?

[`SkillSourceFromEntriesOptions`](#skillsourcefromentriesoptions) = `{}`

#### Returns

[`SkillSource`](#skillsource)

#### Throws

ParseError when the entries do not contain `SKILL.md` or the skill
frontmatter is invalid.

***

### toDisclosureInstructions()

> **toDisclosureInstructions**(`options?`): `string`

Generates canonical system-instruction text for progressive disclosure reads.

#### Parameters

##### options?

[`DisclosureInstructionOptions`](#disclosureinstructionoptions) = `{}`

Optional tool naming override.

#### Returns

`string`

Multi-line guidance text for model system prompts.

***

### toDisclosurePrompt()

> **toDisclosurePrompt**(`entries`): `string`

Generates `<available_skills>` XML including optional tier-3 resource hints.

This is a host extension for progressive disclosure workflows and does not
replace the base `toPrompt` output contract.

#### Parameters

##### entries

[`DisclosurePromptEntry`](#disclosurepromptentry)[]

Prompt entries with optional resource names.

#### Returns

`string`

XML block describing skills and available resources.

***

### toPrompt()

#### Call Signature

> **toPrompt**(`entries`): `string`

Generates the `<available_skills>` XML block for system prompts.

The base output mirrors the reference XML shape and omits host-specific
protocol instructions.

##### Parameters

###### entries

[`SkillPromptEntry`](#skillpromptentry)[]

Prompt entries or raw SKILL.md sources.

##### Returns

`string`

XML block describing available skills.

#### Call Signature

> **toPrompt**(`entries`): `string`

Generates the `<available_skills>` XML block for system prompts.

The base output mirrors the reference XML shape and omits host-specific
protocol instructions.

##### Parameters

###### entries

[`SkillPromptSource`](#skillpromptsource)[]

Prompt entries or raw SKILL.md sources.

##### Returns

`string`

XML block describing available skills.

***

### toReadToolSchema()

> **toReadToolSchema**(`skills`, `options?`): [`ReadToolSchema`](#readtoolschema)

Builds a strict JSON Schema declaration for the skill read tool.

The `name` enum is derived from current skills. `resource` remains a free-form
string because resources are typically discovered after reading the overview.

#### Parameters

##### skills

readonly `Pick`\<[`ResolvedSkill`](#resolvedskill)\<[`SkillMetadataMap`](#skillmetadatamap)\>, `"name"`\>[]

Skills available in the current host/session.

##### options?

[`ReadToolSchemaOptions`](#readtoolschemaoptions) = `{}`

Optional tool naming and description overrides.

#### Returns

[`ReadToolSchema`](#readtoolschema)

Tool declaration object with `parametersJsonSchema`.

***

### validateSkillContent()

> **validateSkillContent**(`content`): `string`[]

Validate complete SKILL.md content.

Parses the content and validates the resulting properties.

#### Parameters

##### content

`string`

Raw SKILL.md content

#### Returns

`string`[]

List of validation error messages. Empty list means valid.

#### Example

```ts
const errors = validateSkillContent(`---
name: demo
description: Demo skill
---
# Body`)
```

#### See

 - https://agentskills.io/specification
 - https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/validator.py

Spec: https://agentskills.io/specification

***

### validateSkillEntries()

> **validateSkillEntries**(`entries`, `options?`): `string`[]

Validates a skill represented as an in-memory file list.
The host can map filesystem concepts (exists, isDirectory, name) into options.

#### Parameters

##### entries

`Iterable`\<[`SkillContentEntry`](#skillcontententry), `any`, `any`\> \| `null` \| `undefined`

In-memory file entries for one skill directory.

##### options?

[`SkillValidationOptions`](#skillvalidationoptions) = `{}`

Host context for path state and expected name checks.

#### Returns

`string`[]

List of validation errors. Empty list means valid.

#### Example

```ts
const errors = validateSkillEntries(
  [{ name: "SKILL.md", content: "---\nname: demo\ndescription: Demo\n---" }],
  { expectedName: "demo" }
)
```

#### See

 - https://agentskills.io/specification
 - https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/validator.py

***

### validateSkillPatch()

> **validateSkillPatch**(`patch`): [`SkillPatchValidationResult`](#skillpatchvalidationresult)

Validates and normalizes a candidate patch payload.

#### Parameters

##### patch

`unknown`

Unknown candidate patch object.

#### Returns

[`SkillPatchValidationResult`](#skillpatchvalidationresult)

Normalized patch when valid, otherwise structured issues.

#### Example

```ts
const result = validateSkillPatch({
  version: 1,
  operations: [{ type: "replace", before: "old", after: "new" }]
})
```

#### See

https://agentskills.io/specification

***

### validateSkillProperties()

> **validateSkillProperties**(`properties`, `options?`): `string`[]

Validate skill properties.

This is the core validation function that works on parsed properties.
Provide expectedName to enforce a host-level name match (directory, slug, or ID).

#### Parameters

##### properties

[`SkillProperties`](#skillproperties)

Parsed skill properties

##### options?

[`ValidateSkillPropertiesOptions`](#validateskillpropertiesoptions) = `{}`

Validation options including optional expected skill name.

#### Returns

`string`[]

List of validation error messages. Empty list means valid.

#### Example

```ts
const errors = validateSkillProperties({
  name: "demo-skill",
  description: "Demo skill"
})
```

#### See

 - https://agentskills.io/specification
 - https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/validator.py

Spec: https://agentskills.io/specification
