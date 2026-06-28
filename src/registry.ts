import { handleSkillRead, toReadToolSchema } from "./disclosure.js";
import type {
  ReadToolSchema,
  ReadToolSchemaOptions,
  SkillReadArgs,
  SkillReadError,
  SkillReadResult,
} from "./disclosure.js";
import { ParseError } from "./errors.js";
import type { ResolvedSkill, SkillContentEntry, SkillResource } from "./models.js";
import { extractResourceLinks, findSkillMdFile, parseSkillContent } from "./parser.js";
import { toDisclosureInstructions, toDisclosurePrompt } from "./prompt.js";
import type { DisclosureInstructionOptions } from "./prompt.js";

/**
 * Catalog metadata returned by `SkillSource.list()`.
 *
 * This is the prompt-facing view of a skill: enough for a model to decide
 * whether to read it, without loading the full `SKILL.md` body.
 */
export interface SkillDescriptor extends Pick<
  ResolvedSkill,
  "allowedTools" | "compatibility" | "description" | "license" | "location" | "metadata" | "name"
> {
  /** Resource names exposed as prompt hints; paths and contents stay behind `load()`. */
  resources?: Array<SkillResource["name"]>;
  /** Source identifier. The registry fills this when a source omits it. */
  sourceId?: string;
}

/**
 * Storage adapter for Agent Skills.
 *
 * The shape follows Cloudflare Agents SDK's `SkillSource`: `list()` exposes the
 * catalog, `load()` returns full content, and `refresh()` lets live stores update
 * before the registry rebuilds. This SDK keeps `load()` on the existing
 * `ResolvedSkill` model instead of Cloudflare's `SkillContent`.
 *
 * @see https://github.com/cloudflare/agents/blob/main/packages/agents/src/skills/types.ts
 */
export interface SkillSource {
  /** Stable key used in registry fingerprints, warnings, and duplicate diagnostics. */
  id: string;
  /** Host version marker. Change it when catalog entries or loaded content change. */
  fingerprint: string;
  /** Return catalog metadata without loading full skill bodies. */
  list(): Promise<SkillDescriptor[]>;
  /** Load full skill content, or `null` when this source does not own `name`. */
  load(name: ResolvedSkill["name"]): Promise<ResolvedSkill | null>;
  /** Optional fast path for hosts that can fetch one resource without loading the skill. */
  readResource?(
    name: ResolvedSkill["name"],
    path: SkillResource["path"],
  ): Promise<SkillResource | null>;
  /** Refresh live backing storage before the registry lists skills again. */
  refresh?(): Promise<void>;
}

/**
 * Options for `skillSourceFromEntries()`.
 */
export interface SkillSourceFromEntriesOptions {
  /** Source id used in registry fingerprints and warnings. Defaults to `entries`. */
  id?: string;
  /** Explicit source fingerprint. Defaults to a stable hash of file names and contents. */
  fingerprint?: string;
  /** Host label attached to the resolved skill and prompt catalog. */
  location?: ResolvedSkill["location"];
}

/**
 * Point-in-time catalog state for prompt caching or host diagnostics.
 */
export interface SkillRegistrySnapshot {
  /** Combined `${source.id}:${source.fingerprint}` value for the loaded sources. */
  fingerprint: string;
  /** Disclosure instructions and `<available_skills>`, or `null` when empty. */
  catalogPrompt: string | null;
}

const stableHash = (parts: string[]): string => {
  let hash = 0x811c9dc5;
  for (const part of parts) {
    for (let index = 0; index < part.length; index++) {
      hash ^= part.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    hash ^= 0xff;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
};

const resolveSkillFromEntries = (
  entries: SkillContentEntry[],
  options: SkillSourceFromEntriesOptions,
): ResolvedSkill => {
  const skillFile = findSkillMdFile(entries);
  if (!skillFile) {
    const locationLabel = options.location ? ` in ${options.location}` : "";
    throw new ParseError(`SKILL.md not found${locationLabel}`);
  }

  const { properties, body } = parseSkillContent(skillFile.content);
  const filesByName = new Map(entries.map((entry) => [entry.name, entry]));
  const resources: SkillResource[] = [];

  for (const link of extractResourceLinks(body)) {
    const file = filesByName.get(link.path);
    if (!file) {
      continue;
    }
    resources.push({
      name: link.name,
      path: link.path,
      content: file.content,
    });
  }

  return {
    ...properties,
    body,
    resources,
    ...(options.location !== undefined && { location: options.location }),
  };
};

/**
 * Create a static source from one `SKILL.md` file plus optional referenced files.
 *
 * Resource entries are inferred from markdown links in the skill body. A linked
 * resource is included only when an entry with the same relative path exists.
 * The default fingerprint is order-independent so callers can pass filesystem,
 * ZIP, or database results without sorting first.
 *
 * @throws ParseError when the entries do not contain `SKILL.md` or the skill
 * frontmatter is invalid.
 */
export function skillSourceFromEntries(
  files: Iterable<SkillContentEntry>,
  options: SkillSourceFromEntriesOptions = {},
): SkillSource {
  const entries = Array.from(files);
  const fingerprintEntries = [...entries].sort(
    (left, right) =>
      left.name.localeCompare(right.name) || left.content.localeCompare(right.content),
  );
  const id = options.id ?? "entries";
  const fingerprint =
    options.fingerprint ??
    stableHash(fingerprintEntries.flatMap((entry) => [entry.name, entry.content]));
  let cached: ResolvedSkill | null = null;

  const resolve = (): ResolvedSkill => {
    cached ??= resolveSkillFromEntries(entries, options);
    return cached;
  };

  return {
    id,
    fingerprint,
    async list() {
      const skill = resolve();
      return [
        {
          name: skill.name,
          description: skill.description,
          resources: skill.resources.map((resource) => resource.name),
          sourceId: id,
          ...(skill.location !== undefined && { location: skill.location }),
          ...(skill.allowedTools !== undefined && { allowedTools: skill.allowedTools }),
          ...(skill.compatibility !== undefined && { compatibility: skill.compatibility }),
          ...(skill.license !== undefined && { license: skill.license }),
          ...(skill.metadata !== undefined && { metadata: skill.metadata }),
        },
      ];
    },
    async load(name) {
      const skill = resolve();
      return skill.name === name
        ? {
            ...skill,
            resources: skill.resources.map((resource) => ({ ...resource })),
          }
        : null;
    },
    async readResource(name, path) {
      const skill = resolve();
      if (skill.name !== name) return null;
      const resource = skill.resources.find((candidate) => candidate.path === path);
      return resource ? { ...resource } : null;
    },
  };
}

/**
 * Loaded catalog over ordered skill sources.
 *
 * Source order is precedence: the first source to list a skill name owns reads
 * for that name, and later duplicates are ignored with a warning. Listing and
 * refresh failures are recorded in `warnings` instead of failing the whole
 * registry.
 */
export interface SkillRegistry {
  /** Non-fatal diagnostics from the most recent load or refresh. */
  readonly warnings: string[];
  /** Combined `${source.id}:${source.fingerprint}` value for the loaded sources. */
  readonly fingerprint: string;
  /** Call each source's `refresh()` hook, then rebuild the catalog. */
  refresh(): Promise<void>;
  /** Return the current catalog fingerprint and prompt in one object. */
  snapshot(options?: DisclosureInstructionOptions): SkillRegistrySnapshot;
  /** Return disclosure instructions and `<available_skills>`, or `null` when empty. */
  systemPrompt(options?: DisclosureInstructionOptions): string | null;
  /** Return a strict JSON Schema read-tool declaration for the current catalog. */
  readTool(options?: ReadToolSchemaOptions): ReadToolSchema;
  /** Load full content from the source that owns `name`, or `null` when absent. */
  loadSkill(name: ResolvedSkill["name"]): Promise<ResolvedSkill | null>;
  /** Handle a progressive disclosure read against the source that owns `args.name`. */
  read(args: SkillReadArgs): Promise<SkillReadResult | SkillReadError>;
}

/**
 * Create a registry and eagerly list its sources.
 *
 * The returned registry is ready to build prompts, expose the read tool schema,
 * and service read calls without a separate initialization step.
 */
export async function createSkillRegistry(sources: SkillSource[]): Promise<SkillRegistry> {
  const descriptors = new Map<ResolvedSkill["name"], SkillDescriptor>();
  const sourceBySkill = new Map<ResolvedSkill["name"], SkillSource>();
  const warnings: string[] = [];
  const fingerprint = (): string =>
    sources.map((source) => `${source.id}:${source.fingerprint}`).join("|");

  const load = async (): Promise<void> => {
    descriptors.clear();
    sourceBySkill.clear();
    warnings.length = 0;

    for (const source of sources) {
      let listed: SkillDescriptor[];
      try {
        listed = await source.list();
      } catch (error) {
        warnings.push(
          `Skill source "${source.id}" failed to list skills and was skipped: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        continue;
      }

      for (const descriptor of listed) {
        if (descriptors.has(descriptor.name)) {
          warnings.push(
            `Duplicate skill "${descriptor.name}" from ${source.id} ignored; already registered.`,
          );
          continue;
        }

        descriptors.set(descriptor.name, {
          ...descriptor,
          sourceId: descriptor.sourceId ?? source.id,
        });
        sourceBySkill.set(descriptor.name, source);
      }
    }
  };

  await load();

  const catalogPrompt = (options: DisclosureInstructionOptions = {}): string | null =>
    descriptors.size === 0
      ? null
      : [toDisclosureInstructions(options), toDisclosurePrompt([...descriptors.values()])].join(
          "\n\n",
        );

  const loadSkill = async (name: ResolvedSkill["name"]): Promise<ResolvedSkill | null> => {
    const source = sourceBySkill.get(name);
    return source ? source.load(name) : null;
  };

  const registry: SkillRegistry = {
    warnings,
    get fingerprint() {
      return fingerprint();
    },
    async refresh() {
      const refreshWarnings: string[] = [];

      await Promise.all(
        sources.map(async (source) => {
          try {
            await source.refresh?.();
          } catch (error) {
            refreshWarnings.push(
              `Skill source "${source.id}" failed to refresh: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }),
      );

      await load();
      warnings.push(...refreshWarnings);
    },
    snapshot(options = {}) {
      return {
        fingerprint: fingerprint(),
        catalogPrompt: catalogPrompt(options),
      };
    },
    systemPrompt(options = {}) {
      return catalogPrompt(options);
    },
    readTool(options = {}) {
      return toReadToolSchema([...descriptors.values()], options);
    },
    loadSkill,
    async read(args) {
      const invalidArgument = handleSkillRead([], args);
      if (!invalidArgument.ok && invalidArgument.code === "INVALID_ARGUMENT") {
        return invalidArgument;
      }

      const skill = await loadSkill(args.name);
      return handleSkillRead(skill ? [skill] : [], args);
    },
  };

  return registry;
}
