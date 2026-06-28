# agent-skills-ts-sdk

[![CI](https://github.com/WebMCP-org/agent-skills-ts-sdk/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/WebMCP-org/agent-skills-ts-sdk/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/agent-skills-ts-sdk)](https://www.npmjs.com/package/agent-skills-ts-sdk)
[![coverage thresholds](https://img.shields.io/badge/coverage-95%25%20lines%20%2F%2090%25%20branches-blue)](#development)
[![license](https://img.shields.io/npm/l/agent-skills-ts-sdk)](./LICENSE)

TypeScript parser, validator, prompt, and patch utilities for Agent Skills
`SKILL.md` files. The package tracks the [AgentSkills specification](https://agentskills.io/specification)
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

- Parsing: `parseFrontmatter`, `parseSkillContent`, `extractBody`,
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
`compatibility`, `metadata`, and experimental `allowed-tools`.

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
```

## References

- [AgentSkills specification](https://agentskills.io/specification)
- [Python reference implementation](https://github.com/agentskills/agentskills/tree/main/skills-ref)
- [Example skills](https://github.com/anthropics/skills)

## License

MIT
