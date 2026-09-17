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

it("keeps healthy sources usable when other sources fail to list or refresh", async () => {
  const healthy = makeSource("healthy", "v1", {
    name: "demo",
    description: "Demo",
    body: "Instructions",
    resources: [],
  });
  const failing: SkillSource = {
    id: "failing",
    fingerprint: "v1",
    async list() {
      throw new Error("offline");
    },
    async load() {
      return null;
    },
    async refresh() {
      throw "refresh offline";
    },
  };
  const registry = await createSkillRegistry([failing, healthy]);
  expect(registry.warnings).toEqual([
    'Skill source "failing" failed to list skills and was skipped: offline',
  ]);
  await registry.refresh();
  expect(registry.warnings).toEqual([
    'Skill source "failing" failed to list skills and was skipped: offline',
    'Skill source "failing" failed to refresh: refresh offline',
  ]);
  expect(registry.list().map(({ name }) => name)).toEqual(["demo"]);
  expect(await registry.read({ name: "demo" })).toEqual({ ok: true, content: "Instructions" });
  expect(await registry.loadSkill("absent")).toBeNull();
  expect(await registry.read({ name: "absent" })).toMatchObject({
    ok: false,
    code: "SKILL_NOT_FOUND",
  });
  // @ts-expect-error Exercise untyped tool input at the public boundary.
  expect(await registry.read({ name: 42 })).toMatchObject({ ok: false, code: "INVALID_ARGUMENT" });
});

it("handles an empty catalog and non-Error source failures", async () => {
  const registry = await createSkillRegistry([
    {
      id: "broken",
      fingerprint: "v1",
      async list() {
        throw "offline";
      },
      async load() {
        return null;
      },
      async refresh() {
        throw new Error("refresh offline");
      },
    },
  ]);
  expect(registry.list()).toEqual([]);
  expect(registry.systemPrompt()).toBeNull();
  expect(registry.snapshot()).toEqual({ fingerprint: "broken:v1", catalogPrompt: null });
  await registry.refresh();
  expect(registry.warnings).toEqual([
    'Skill source "broken" failed to list skills and was skipped: offline',
    'Skill source "broken" failed to refresh: refresh offline',
  ]);
});

it("returns isolated catalog data for custom renderers", async () => {
  const descriptor = {
    name: "demo",
    description: "Demo",
    metadata: { version: "1" },
    resources: ["guide"],
  };
  const registry = await createSkillRegistry([
    {
      id: "custom",
      fingerprint: "v1",
      async list() {
        return [descriptor];
      },
      async load() {
        return null;
      },
    },
  ]);
  const listed = registry.list()[0]!;
  listed.name = "changed";
  listed.metadata!.version = "2";
  listed.resources!.push("changed");
  expect(registry.list()).toEqual([{ ...descriptor, sourceId: "custom" }]);
});

it("handles absent files and resources without loading unrelated skills", async () => {
  const { skillSourceFromEntries } = await import("../src/index");
  await expect(skillSourceFromEntries([]).list()).rejects.toThrow("SKILL.md not found");
  await expect(skillSourceFromEntries([], { location: "custom" }).load("demo")).rejects.toThrow(
    "SKILL.md not found in custom",
  );
  const source = skillSourceFromEntries(
    [
      {
        name: "SKILL.md",
        content: "---\nname: demo\ndescription: Demo\n---\n[missing](custom/absent.md)",
      },
    ],
    { fingerprint: "v1" },
  );
  expect(source.fingerprint).toBe("v1");
  expect(await source.load("other")).toBeNull();
  expect(await source.load("demo")).toMatchObject({ resources: [] });
  expect(await source.readResource?.("other", "custom/absent.md")).toBeNull();
  expect(await source.readResource?.("demo", "custom/absent.md")).toBeNull();
});
