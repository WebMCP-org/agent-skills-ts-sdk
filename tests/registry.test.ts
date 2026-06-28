import { describe, expect, it } from "vite-plus/test";
import type { ResolvedSkill } from "../src/models";
import { createSkillRegistry } from "../src/registry";
import type { SkillSource } from "../src/registry";

describe("SkillRegistry", () => {
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
