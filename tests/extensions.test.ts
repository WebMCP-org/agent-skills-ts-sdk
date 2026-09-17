import { describe, expect, expectTypeOf, it } from "vite-plus/test";
import {
  applySkillPatch,
  parseSkillDocument,
  validateSkillContent,
  validateSkillEntries,
} from "../src/index";

describe("skill documents", () => {
  it("parses extension metadata without imposing a skill schema or presentation", () => {
    const content = `---
metadata:
  enabled: true
  retries: 3
  tags: [web, tools]
---
# Host instructions`;
    expect(parseSkillDocument(content)).toEqual({
      metadata: { metadata: { enabled: true, retries: 3, tags: ["web", "tools"] } },
      body: "# Host instructions",
    });
  });
});

it("infers a host schema's result and propagates its validation errors", () => {
  const parseMetadata = (value: Record<string, unknown>) => {
    if (typeof value.version !== "number") throw new Error("version must be a number");
    return { version: value.version };
  };
  const parsed = parseSkillDocument("---\nversion: 2\n---\nBody", { parseMetadata });
  expectTypeOf(parsed.metadata).toEqualTypeOf<{ version: number }>();
  expect(parsed.metadata).toEqual({ version: 2 });
  expect(() => parseSkillDocument("---\nversion: wrong\n---", { parseMetadata })).toThrow(
    "version must be a number",
  );
});

const extendedSkill = `---
name: demo
description: Demo
version: 2
---
# Instructions`;

it("allows declared extension fields while retaining core and unknown-field validation", () => {
  const options = { allowedFields: ["version"], expectedName: "demo" };
  expect(validateSkillContent(extendedSkill, options)).toEqual([]);
  expect(validateSkillEntries([{ name: "SKILL.md", content: extendedSkill }], options)).toEqual([]);
  expect(validateSkillContent(extendedSkill)).toEqual([
    expect.stringContaining("Unexpected fields"),
  ]);
  expect(validateSkillContent(extendedSkill.replace("version: 2", "typo: 2"), options)).toEqual([
    expect.stringContaining("Unexpected fields"),
  ]);
  expect(
    validateSkillContent(extendedSkill.replace("name: demo", "name: INVALID"), options),
  ).toEqual([expect.stringContaining("must be lowercase"), expect.stringContaining("must match")]);
});

it("lets hosts accept all extensions and compose validators over metadata and body", () => {
  const options = {
    unknownFields: "allow" as const,
    validators: [
      (metadata: Record<string, unknown>) => (metadata.version === 2 ? [] : ["version must be 2"]),
      (_metadata: Record<string, unknown>, body: string) =>
        body.startsWith("# ") ? [] : ["heading required"],
    ],
  };
  expect(validateSkillContent(extendedSkill, options)).toEqual([]);
  expect(
    validateSkillContent(
      extendedSkill.replace("version: 2", "version: 1").replace("# ", ""),
      options,
    ),
  ).toEqual(["version must be 2", "heading required"]);
  expect(
    validateSkillContent(extendedSkill.replace("name: demo", "name: INVALID"), options),
  ).toEqual([expect.stringContaining("must be lowercase")]);
  expect(validateSkillContent(extendedSkill)).toEqual([
    expect.stringContaining("Unexpected fields"),
  ]);
});

it("applies extension validation consistently to atomic patches", () => {
  const patch = {
    version: 1 as const,
    operations: [{ type: "replace" as const, before: "version: 2", after: "version: 3" }],
  };
  const validate = { allowedFields: ["version"], expectedName: "demo" };
  expect(applySkillPatch(extendedSkill, patch, { validate })).toMatchObject({
    ok: true,
    content: extendedSkill.replace("version: 2", "version: 3"),
  });
  expect(
    applySkillPatch(extendedSkill, patch, {
      validate: { ...validate, validators: [() => ["version locked"]] },
    }),
  ).toMatchObject({ ok: false, errors: [{ code: "SKILL_INVALID", message: "version locked" }] });
});

it("discovers resources in host-defined directories allowed by the current spec", async () => {
  const { extractResourceLinks, skillSourceFromEntries } = await import("../src/index");
  const content = "---\nname: demo\ndescription: Demo\n---\n[Policy](policies/review.md)";
  expect(extractResourceLinks(content)).toEqual([{ name: "Policy", path: "policies/review.md" }]);
  const source = skillSourceFromEntries([
    { name: "SKILL.md", content },
    { name: "policies/review.md", content: "Review policy" },
  ]);
  expect(await source.readResource?.("demo", "policies/review.md")).toEqual({
    name: "Policy",
    path: "policies/review.md",
    content: "Review policy",
  });
});

it("exposes registry descriptors for host-controlled presentation", async () => {
  const { createSkillRegistry, skillSourceFromEntries } = await import("../src/index");
  const registry = await createSkillRegistry([
    skillSourceFromEntries([{ name: "SKILL.md", content: extendedSkill }]),
  ]);
  expect(registry.list()).toEqual([
    { name: "demo", description: "Demo", resources: [], sourceId: "entries" },
  ]);
  registry.list().pop();
  expect(registry.list()).toHaveLength(1);
});

it("uses the same embedded-input policy for parsing, validation, entries, and patches", async () => {
  const { parseFrontmatter, readSkillProperties } = await import("../src/index");
  const content = `\uFEFF\n  ${extendedSkill}`;
  const options = { inputMode: "embedded" as const, allowedFields: ["version"] };
  expect(parseSkillDocument(content, options).body).toBe("# Instructions");
  expect(parseFrontmatter(content, options).metadata.version).toBe(2);
  expect(readSkillProperties([{ name: "SKILL.md", content }], options).name).toBe("demo");
  expect(validateSkillContent(content, options)).toEqual([]);
  expect(validateSkillEntries([{ name: "SKILL.md", content }], options)).toEqual([]);
  expect(applySkillPatch(content, { version: 1, operations: [] }, { validate: options }).ok).toBe(
    true,
  );
});

it("preserves prototype-like metadata keys as data", async () => {
  const { parseFrontmatter } = await import("../src/index");
  const content = `---
name: demo
description: Demo
metadata:
  __proto__: safe
  constructor: safe
---`;
  const { metadata } = parseFrontmatter(content);
  expect(Object.hasOwn(metadata.metadata!, "__proto__")).toBe(true);
  expect(metadata.metadata?.__proto__).toBe("safe");
  expect(metadata.metadata?.constructor).toBe("safe");
  expect(Object.getPrototypeOf(metadata.metadata)).toBe(Object.prototype);
});

it("retains built-in errors and later rules when a host validator throws", () => {
  const validators = [
    () => {
      throw new Error("schema unavailable");
    },
    () => {
      throw "policy unavailable";
    },
    () => ["last rule"],
  ];
  expect(
    validateSkillContent(extendedSkill.replace("name: demo", "name: INVALID"), {
      allowedFields: ["version"],
      validators,
    }),
  ).toEqual([
    expect.stringContaining("must be lowercase"),
    "Validator failed: schema unavailable",
    "Validator failed: policy unavailable",
    "last rule",
  ]);
  expect(
    validateSkillEntries([{ name: "SKILL.md", content: extendedSkill }], {
      allowedFields: ["version"],
      validators,
    }),
  ).toEqual([
    "Validator failed: schema unavailable",
    "Validator failed: policy unavailable",
    "last rule",
  ]);
});

it.each([
  "no frontmatter",
  "---\nmissing: closing delimiter",
  "---\n- sequence\n---",
  "---\nvalue: [unterminated\n---",
  "---\nvalue: 1\nvalue: 2\n---",
  "---\nvalue: &anchor text\n---",
  "---\nvalue: *anchor\n---",
  "---\nvalue: !!str text\n---",
  "---\nvalue: &anchor [one]\n---",
])("rejects malformed or unsafe documents before calling a host schema: %s", (content) => {
  let calls = 0;
  expect(() =>
    parseSkillDocument(content, {
      parseMetadata: () => {
        calls++;
        return {};
      },
    }),
  ).toThrow();
  expect(calls).toBe(0);
});

it("keeps canonical metadata validation when allowing host fields", () => {
  const content = extendedSkill.replace("version: 2", "metadata:\n  nested:\n    enabled: true");
  expect(validateSkillContent(content, { unknownFields: "allow" })).toEqual([
    "Field 'metadata' must contain scalar values",
  ]);
  expect(
    validateSkillContent("---\ndescription: Demo\n---", { validators: [() => ["should not run"]] }),
  ).toEqual(["Missing required field in frontmatter: name"]);
});

it("keeps registry fingerprints accessible independently of generated prompts", async () => {
  const { createSkillRegistry, skillSourceFromEntries, toDisclosurePrompt, extractResourceLinks } =
    await import("../src/index");
  expect(toDisclosurePrompt([])).toBe("<available_skills>\n</available_skills>");
  expect(extractResourceLinks("references/guide.md")).toEqual([
    { name: "references/guide.md", path: "references/guide.md" },
  ]);
  expect(extractResourceLinks("[unterminated")).toEqual([]);
  const entries = [
    { name: "SKILL.md", content: extendedSkill },
    { name: "other.md", content: "a" },
    { name: "other.md", content: "b" },
  ];
  const source = skillSourceFromEntries(entries);
  expect(source.fingerprint).toBe(skillSourceFromEntries([...entries].reverse()).fingerprint);
  const registry = await createSkillRegistry([source]);
  expect(registry.fingerprint).toBe(`entries:${source.fingerprint}`);
});

it("treats delimiter text inside metadata as data, not the end of frontmatter", async () => {
  const { parseFrontmatter, extractBody } = await import("../src/index");
  const content =
    '---\nname: demo\ndescription: "before---after"\nmetadata:\n  separator: "---"\n---\n# Body\n---\nRule';
  expect(parseSkillDocument(content).metadata.description).toBe("before---after");
  expect(parseFrontmatter(content).metadata.metadata?.separator).toBe("---");
  expect(extractBody(content)).toBe("# Body\n---\nRule");
  expect(validateSkillContent(content)).toEqual([]);
});

it.each(["./C:/outside/secret.md", "././c:secret.md", "./https:remote.md", "./file:/etc/passwd"])(
  "rejects absolute resource targets hidden by relative prefixes: %s",
  async (path) => {
    const { extractResourceLinks } = await import("../src/index");
    expect(extractResourceLinks(`[secret](${path})`)).toEqual([]);
  },
);

it.each(["\u2028", "\u2029"])(
  "keeps Unicode separator %j inside YAML scalars",
  async (separator) => {
    const { parseFrontmatter, extractBody } = await import("../src/index");
    const description = `before${separator}---${separator}after`;
    for (const value of [description, `"${description}"`]) {
      const content = `---\r\nname: demo\r\ndescription: ${value}\r\n---\t \r\n# Body`;
      expect(parseFrontmatter(content).metadata.description).toBe(description);
      expect(parseSkillDocument(content).metadata.description).toBe(description);
      expect(extractBody(content)).toBe("# Body");
    }
  },
);
