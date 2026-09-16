# agent-skills-ts-sdk

[![CI](https://github.com/WebMCP-org/agent-skills-ts-sdk/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/WebMCP-org/agent-skills-ts-sdk/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/agent-skills-ts-sdk)](https://www.npmjs.com/package/agent-skills-ts-sdk)
[![coverage thresholds](https://img.shields.io/badge/coverage-98%25%20lines%20%2F%2095%25%20branches-blue)](#development)
[![license](https://img.shields.io/npm/l/agent-skills-ts-sdk)](./LICENSE)

TypeScript parsing, validation, and patch utilities for Agent Skills `SKILL.md`
files. Bring your own metadata schema, extension validators, and model presentation.
Prompt and disclosure helpers are optional. The package tracks the [AgentSkills specification](https://agentskills.io/specification)
and the Python [`skills-ref`](https://github.com/agentskills/agentskills/tree/main/skills-ref)
reference behavior.

## What It Does

```text
SKILL.md files
  |
  v
parse + validate
  |
  +--> prompt XML + read tool schema --> model system prompt + tools
  |
  +--> diff + patch helpers -----------> model-proposed skill edits
```

## Install

```bash
pnpm add agent-skills-ts-sdk
```

## Quick Start

### Parse and validate

```typescript
import { parseSkillContent, validateSkillContent } from "agent-skills-ts-sdk";

const content = `---
name: my-skill
description: A test skill
---
# My Skill

Instructions here.`;

const { properties, body } = parseSkillContent(content);
const errors = validateSkillContent(content);
```

Use `{ inputMode: "embedded" }` when SKILL.md text comes from a DOM/script tag
and may start with a newline.

### Bring your own metadata schema

`parseSkillDocument` separates YAML parsing from field validation. It preserves
unknown fields, nested metadata, arrays, booleans, and numbers. It does not require
`name` or `description`, so its result is not a claim of AgentSkills conformance.

```typescript
import { parseSkillDocument } from "agent-skills-ts-sdk";

const document = parseSkillDocument(content); // metadata: Record<string, unknown>

const typed = parseSkillDocument("---\nversion: 2\n---\nInstructions", {
  parseMetadata(value) {
    if (typeof value.version !== "number") {
      throw new Error("version must be a number");
    }
    return { version: value.version };
  },
});
// typed.metadata.version is number; schema errors propagate to the caller.
```

Pass a schema library's parser as `parseMetadata: (value) => schema.parse(value)`.
The SDK adds no schema dependency. Flow collections are supported by this parser;
anchors, aliases, and explicit YAML tags are rejected.

Use `parseFrontmatter` for normalized spec fields and string-valued `metadata`.
It also retains top-level extension fields, typed as `unknown` until narrowed.
`parseSkillContent` returns only canonical, camel-cased properties and the body.

### Extend validation

```typescript
import { applySkillPatch, validateSkillContent, type SkillValidator } from "agent-skills-ts-sdk";

const requireVersion: SkillValidator = (frontmatter) =>
  frontmatter.version === 2 ? [] : ["version must be 2"];

const validation = {
  allowedFields: ["version"],
  validators: [requireVersion],
};
const errors = validateSkillContent(content, validation);
const result = applySkillPatch(content, patch, { validate: validation });
```

Validation rejects unknown fields by default. `allowedFields` declares specific
extensions; `unknownFields: "allow"` accepts all extra fields. Both keep the core
AgentSkills rules, including string-valued `metadata`. To change those field
shapes, use `parseSkillDocument` with your own schema instead.

Validators receive normalized frontmatter and the trimmed body. They run
synchronously in order after parsing succeeds, alongside core validation, and
must not mutate the input. Each returns error strings; a thrown error becomes a
`Validator failed: ...` error without discarding other diagnostics. No plugin
registration or global state is needed.

The same options work with `validateSkillEntries` and patch validation, including
`expectedName` and `inputMode: "embedded"`.

### Validate in-memory files

```typescript
import { readSkillProperties, validateSkillEntries } from "agent-skills-ts-sdk";

const files = [{ name: "SKILL.md", content }];
const properties = readSkillProperties(files);
const errors = validateSkillEntries(files, { expectedName: properties.name });
```

### Build model-facing prompt content

```typescript
import { createSkillRegistry, skillSourceFromEntries } from "agent-skills-ts-sdk";

const source = skillSourceFromEntries([
  { name: "SKILL.md", content: skillMarkdown },
  { name: "references/build-pizza.md", content: buildPizzaReference },
]);

const registry = await createSkillRegistry([source]);
const systemPrompt = registry.systemPrompt({ toolName: "read_site_context" });
const readTool = registry.readTool({
  toolName: "read_site_context",
});
```

Use `registry.list()` to get a copy of the catalog and render your own prompt,
UI, or tool protocol. Reading and loading skills do not require the generated
prompt or read-tool schema.

Model-facing shape:

```text
system prompt
  +-- disclosure instructions
  +-- <available_skills>
        +-- pizza-maker
              +-- resources: build-pizza

tool
  +-- read_site_context({ name, resource? })
```

Formatted for readability, the system prompt looks like:

```text
Skills provide context for using tools effectively.
Call read_site_context with a skill name to read its overview and discover available resources.
Then call read_site_context with both a skill name and resource name to read detailed instructions.

<available_skills>
  <skill>
    <name>
      pizza-maker
    </name>
    <description>
      Interactive pizza builder
    </description>
    <resources>
      build-pizza
    </resources>
  </skill>
</available_skills>
```

`readTool` is a strict JSON-schema tool declaration: `name` is required and
limited to the current skill names, `resource` is optional, and extra fields are
rejected.

Typical read calls:

```json
{ "name": "pizza-maker" }
```

```json
{ "name": "pizza-maker", "resource": "build-pizza" }
```

Handle those calls with the same registry:

```typescript
const result = await registry.read({ name: "pizza-maker", resource: "build-pizza" });
```

### Apply skill patches

```typescript
import { applySkillPatch, createSkillPatch } from "agent-skills-ts-sdk";

const patch = createSkillPatch(oldContent, newContent);
const result = applySkillPatch(oldContent, patch);
```

## API Shape

- Parsing: `parseSkillDocument`, `parseFrontmatter`, `parseSkillContent`, `extractBody`,
  `frontmatterToProperties`, `extractResourceLinks`.
- Validation: `validateSkillProperties`, `validateSkillContent`,
  `validateSkillEntries`.
- In-memory lookup: `findSkillMdFile`, `readSkillProperties`.
- Sources/registry: `skillSourceFromEntries`, `createSkillRegistry`,
  `SkillRegistry`.
- Prompt/disclosure: `toPrompt`, `toDisclosurePrompt`,
  `toDisclosureInstructions`, `toReadToolSchema`, `handleSkillRead`.
- Patch utilities: `diffSkillContent`, `createSkillPatch`, `applySkillPatch`,
  `validateSkillPatch`.
- Utilities/types: `estimateTokens`, `normalizeNFKC`, `SkillFrontmatter`,
  `SkillProperties`, `SkillFile`, `SkillMetadata`.

See [API.md](./API.md) for the full module reference.

## Spec Notes

Required fields are `name` and `description`. Optional fields are `license`,
`compatibility`, `metadata`, and experimental `allowed-tools`. Explicit Markdown
resource links can target any skill-local directory; traversal and external URLs
are rejected. Bare path detection uses conventional resource directories.

Directory-level checks are exposed through `validateSkillEntries` so filesystem,
Durable Object, and other storage hosts can use the same validation rules.

## Playground

```bash
vp run playground:dev
```

The playground runs parser, validator, prompt, patch, token estimate, storage,
and rendered Markdown examples in the browser.

## Development

```bash
vp test
vp check
vp run test:coverage
vp run benchmark
```

Coverage is enforced in CI at 98% lines/statements/functions and 95% branches.
Benchmarks report median microseconds per operation; compare a previous bundle
with `node scripts/benchmark.mjs /path/to/previous/index.js` after building.
Vitest 4 matches Vite+'s bundled test runner; TypeScript 6 matches TypeDoc's
supported compiler range.

## References

- [AgentSkills specification](https://agentskills.io/specification)
- [Python reference implementation](https://github.com/agentskills/agentskills/tree/main/skills-ref)
- [Example skills](https://github.com/anthropics/skills)

## License

MIT
