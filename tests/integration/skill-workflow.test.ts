/// <reference types="node" />

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import type { SkillContentEntry } from "../../src/models";
import { createSkillRegistry, skillSourceFromEntries } from "../../src/registry";

const readSkillDirectory = (root: string, directory = root): SkillContentEntry[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return readSkillDirectory(root, path);
    }

    return entry.isFile()
      ? [{ name: relative(root, path), content: readFileSync(path, "utf-8") }]
      : [];
  });

describe("public skill workflow", () => {
  it("turns a real skill directory into model-facing prompt, schema, and reads", async () => {
    const entries = readSkillDirectory(resolve(__dirname, "..", "fixtures", "pizza-maker"));
    const source = skillSourceFromEntries(entries, {
      id: "fixture:pizza-maker",
      location: "tests/fixtures/pizza-maker/SKILL.md",
    });
    expect(skillSourceFromEntries([...entries].reverse()).fingerprint).toBe(source.fingerprint);

    const registry = await createSkillRegistry([source]);

    await expect(source.list()).resolves.toEqual([
      {
        name: "pizza-maker",
        description: "Interactive pizza builder",
        allowedTools: "Read",
        compatibility: "Node.js 20+",
        license: "MIT",
        metadata: { owner: "test" },
        location: "tests/fixtures/pizza-maker/SKILL.md",
        resources: ["build-pizza"],
        sourceId: "fixture:pizza-maker",
      },
    ]);
    expect(registry.snapshot({ toolName: "read_site_context" })).toEqual({
      fingerprint: `fixture:pizza-maker:${source.fingerprint}`,
      catalogPrompt: `Skills provide context for using tools effectively.
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
<location>
tests/fixtures/pizza-maker/SKILL.md
</location>
<resources>
build-pizza
</resources>
</skill>
</available_skills>`,
    });

    expect(registry.readTool({ toolName: "read_site_context" })).toMatchObject({
      name: "read_site_context",
      parametersJsonSchema: {
        properties: {
          name: { enum: ["pizza-maker"] },
          resource: { type: "string" },
        },
      },
    });
    await expect(registry.loadSkill("pizza-maker")).resolves.toMatchObject({
      name: "pizza-maker",
      resources: [{ name: "build-pizza", path: "references/build-pizza.md" }],
    });
    await expect(registry.read({ name: "pizza-maker" })).resolves.toEqual({
      ok: true,
      content: "Use [build-pizza](references/build-pizza.md) when constructing orders.",
    });
    await expect(registry.read({ name: "pizza-maker", resource: "build-pizza" })).resolves.toEqual({
      ok: true,
      content: "Step 1: Prepare dough.\n",
    });
    await expect(
      source.readResource?.("pizza-maker", "references/build-pizza.md"),
    ).resolves.toEqual({
      name: "build-pizza",
      path: "references/build-pizza.md",
      content: "Step 1: Prepare dough.\n",
    });
  });
});
