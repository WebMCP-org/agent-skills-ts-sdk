/// <reference types="node" />

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import type { SkillReadArgs } from "../src/disclosure";
import type { ResolvedSkill } from "../src/models";
import { createSkillRegistry, skillSourceFromEntries } from "../src/registry";
import type { SkillSource } from "../src/registry";

const fixture = (name: string): string =>
  readFileSync(resolve(__dirname, "fixtures", "pizza-maker", name), "utf-8");

const pizzaEntries = () => [
  { name: "SKILL.md", content: fixture("SKILL.md") },
  { name: "references/build-pizza.md", content: fixture("references/build-pizza.md") },
];

describe("SkillRegistry", () => {
  it("builds prompts, tools, and reads from a real skill fixture", async () => {
    const source = skillSourceFromEntries(pizzaEntries(), {
      id: "bundle:pizza",
      location: "tests/fixtures/pizza-maker/SKILL.md",
    });
    const reordered = skillSourceFromEntries([...pizzaEntries()].reverse(), { id: "bundle:pizza" });
    expect(reordered.fingerprint).toBe(source.fingerprint);

    const registry = await createSkillRegistry([source]);
    const skill = await registry.loadSkill("pizza-maker");

    expect(await source.list()).toEqual([
      {
        name: "pizza-maker",
        description: "Interactive pizza builder",
        allowedTools: "Read",
        compatibility: "Node.js 20+",
        license: "MIT",
        metadata: { owner: "test" },
        location: "tests/fixtures/pizza-maker/SKILL.md",
        resources: ["build-pizza"],
        sourceId: "bundle:pizza",
      },
    ]);
    expect(skill).toMatchObject({
      name: "pizza-maker",
      body: "Use [build-pizza](references/build-pizza.md) when constructing orders.",
      resources: [
        {
          name: "build-pizza",
          path: "references/build-pizza.md",
          content: "Step 1: Prepare dough.\n",
        },
      ],
    });
    expect(registry.snapshot({ toolName: "read_site_context" }).fingerprint).toBe(
      `bundle:pizza:${source.fingerprint}`,
    );
    expect(registry.systemPrompt({ toolName: "read_site_context" })).toContain(
      "Call read_site_context with a skill name",
    );
    expect(registry.readTool().parametersJsonSchema).toMatchObject({
      properties: { name: { enum: ["pizza-maker"] } },
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
    await expect(registry.read(null as unknown as SkillReadArgs)).resolves.toMatchObject({
      ok: false,
      code: "INVALID_ARGUMENT",
    });
  });

  it("keeps the first duplicate skill and records a warning", async () => {
    const first = makeSource("first", "v1", {
      name: "pizza-maker",
      description: "First source",
      body: "First body",
      resources: [],
    });
    const second = makeSource("second", "v1", {
      name: "pizza-maker",
      description: "Second source",
      body: "Second body",
      resources: [],
    });

    const registry = await createSkillRegistry([first, second]);

    await expect(registry.read({ name: "pizza-maker" })).resolves.toEqual({
      ok: true,
      content: "First body",
    });
    expect(registry.warnings).toEqual([
      'Duplicate skill "pizza-maker" from second ignored; already registered.',
    ]);
  });

  it("refreshes live sources and rebuilds the catalog", async () => {
    let skill: ResolvedSkill = {
      name: "pizza-maker",
      description: "Old description",
      body: "Old body",
      resources: [],
    };
    let fingerprint = "v1";

    const source: SkillSource = {
      id: "live",
      get fingerprint() {
        return fingerprint;
      },
      async list() {
        return [{ name: skill.name, description: skill.description }];
      },
      async load(name) {
        return name === skill.name ? skill : null;
      },
      async refresh() {
        fingerprint = "v2";
        skill = {
          name: "pizza-maker",
          description: "New description",
          body: "New body",
          resources: [],
        };
      },
    };

    const registry = await createSkillRegistry([source]);
    expect(registry.snapshot().fingerprint).toBe("live:v1");
    expect(registry.systemPrompt()).toContain("Old description");

    await registry.refresh();

    expect(registry.snapshot().fingerprint).toBe("live:v2");
    expect(registry.systemPrompt()).toContain("New description");
    await expect(registry.read({ name: "pizza-maker" })).resolves.toEqual({
      ok: true,
      content: "New body",
    });
  });
});

const makeSource = (id: string, fingerprint: string, skill: ResolvedSkill): SkillSource => ({
  id,
  fingerprint,
  async list() {
    return [
      {
        name: skill.name,
        description: skill.description,
        resources: skill.resources.map((resource) => resource.name),
      },
    ];
  },
  async load(name) {
    return name === skill.name ? skill : null;
  },
});
