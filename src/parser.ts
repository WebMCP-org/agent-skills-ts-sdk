/**
 * YAML frontmatter parsing for SKILL.md files
 *
 * Reference: https://agentskills.io/specification
 * Reference Implementation: https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/parser.py
 */

import type { Document, Scalar, YAMLMap } from "yaml";
import YAML from "yaml";
import { ParseError, ValidationError } from "./errors.js";
import type {
  SkillBody,
  SkillContent,
  SkillContentEntry,
  SkillFrontmatter,
  SkillFrontmatterParseResult,
  SkillMetadataMap,
  SkillParseResult,
  SkillProperties,
  SkillResource,
} from "./models.js";
import { entriesToRecord } from "./utils/objects.js";

const FRONTMATTER_DELIMITER = "---";
const FRONTMATTER_DELIMITER_LENGTH = FRONTMATTER_DELIMITER.length;
const FIELD_NAME = "name";
const FIELD_DESCRIPTION = "description";
const FIELD_METADATA = "metadata";
const FIELD_LICENSE = "license";
const FIELD_COMPATIBILITY = "compatibility";
const FIELD_ALLOWED_TOOLS = "allowed-tools";
const SCALAR_SOURCE_FIELDS = [
  FIELD_NAME,
  FIELD_DESCRIPTION,
  FIELD_LICENSE,
  FIELD_COMPATIBILITY,
  FIELD_ALLOWED_TOOLS,
] as const;
const UTF8_BOM = "\uFEFF";
const INPUT_MODE_STRICT = "strict";
const INPUT_MODE_EMBEDDED = "embedded";
const RESOURCE_DEDUPE_SEPARATOR = "\u0000";
const RESOURCE_PATH_SEGMENTS = new Set([
  "scripts",
  "references",
  "assets",
  "lib",
  "reference",
  "templates",
  "shared",
  "curl",
  "examples",
  "rules",
  "agents",
  "eval-viewer",
]);
const MARKDOWN_RESOURCE_LINK_PATTERN = /\[([^\]\n]+)\]\(([^)\n]+)\)/g;
const BARE_RESOURCE_PATH_PATTERN =
  /(?:\.\/)*(?:scripts|references|assets|lib|reference|templates|shared|curl|examples|rules|agents|eval-viewer)\/[^\s`<>"')\]}]+/g;
const BARE_RESOURCE_TRAILING_PUNCTUATION = /[.,;:!*]+$/;
const BARE_RESOURCE_PATH_PREFIX_PATTERN = /[\p{L}\p{N}_-]/u;
const ROOT_RESOURCE_FILE_PATTERN = /^[^/.][^/]*\.[^/.]+$/;
const CHAR_OPEN_PAREN = "(";
const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

/**
 * Checks whether a value is a non-array object record.
 *
 * @param value - Candidate value.
 * @returns `true` when the value is an object record.
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

/**
 * Checks whether a YAML node is a scalar.
 *
 * @param value - Candidate YAML AST node.
 * @returns `true` when the node is a scalar.
 */
const isScalarNode = (value: unknown): value is Scalar => {
  return YAML.isScalar(value);
};

/**
 * Checks whether a YAML node is a map.
 *
 * @param value - Candidate YAML AST node.
 * @returns `true` when the node is a map.
 */
const isMapNode = (value: unknown): value is YAMLMap => {
  return YAML.isMap(value);
};

/**
 * Checks whether a value is a string.
 *
 * @param value - Candidate value.
 * @returns `true` when the value is a string.
 */
const isString = (value: unknown): value is string => typeof value === "string";

/**
 * Narrows unknown values to metadata maps with string values.
 *
 * @param value - Candidate value.
 * @returns `true` when the value is a string map.
 */
const isMetadataMap = <TMetadata extends SkillMetadataMap>(value: unknown): value is TMetadata => {
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every(isString);
};

/**
 * Parses markdown link URLs that may include optional quoted title text.
 *
 * @param rawPath - Raw link target from markdown.
 * @returns Path component without optional title text.
 */
const stripMarkdownLinkTitle = (rawPath: string): string => {
  const trimmed = rawPath.trim();
  const spaceIndex = trimmed.search(/\s/);
  return spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
};

const stripBareResourceTrailingPunctuation = (rawPath: string): string => {
  return rawPath.replace(BARE_RESOURCE_TRAILING_PUNCTUATION, "");
};

const hasBareResourcePathBoundary = (body: SkillBody, start: number): boolean => {
  if (start <= 0) {
    return true;
  }

  const previous = body[start - 1];
  if (previous === undefined) {
    return true;
  }

  return (
    previous !== "." &&
    previous !== "/" &&
    previous !== CHAR_OPEN_PAREN &&
    previous !== "\\" &&
    !BARE_RESOURCE_PATH_PREFIX_PATTERN.test(previous)
  );
};

const removeResourcePathSuffix = (path: string): string => {
  const queryIndex = path.indexOf("?");
  const hashIndex = path.indexOf("#");
  const cutoff = Math.min(
    path.length,
    queryIndex === -1 ? path.length : queryIndex,
    hashIndex === -1 ? path.length : hashIndex,
  );

  return path.slice(0, cutoff);
};

const hasInvalidResourcePathShape = (path: string): boolean =>
  !path ||
  path.includes("\\") ||
  path.endsWith("/") ||
  path.includes("//") ||
  path.startsWith("../");

const isUnsupportedResourceTarget = (path: string): boolean =>
  !path || path.startsWith("/") || path.startsWith("#") || URL_SCHEME_PATTERN.test(path);

const normalizeResourcePathText = (path: string): string => {
  let normalized = removeResourcePathSuffix(path);
  while (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }
  return normalized;
};

const isAllowedNestedResourcePath = (segments: string[]): boolean => {
  if (segments.length < 2 || !RESOURCE_PATH_SEGMENTS.has(segments[0] ?? "")) {
    return false;
  }
  return segments.every((segment) => segment !== "." && segment !== "..");
};

/**
 * Normalizes and validates a markdown link path as a skill resource path.
 *
 * @param path - Candidate path from markdown link.
 * @returns Canonical resource path or `null` when invalid.
 */
const normalizeResourcePath = (path: string): string | null => {
  if (isUnsupportedResourceTarget(path)) {
    return null;
  }

  const normalized = normalizeResourcePathText(path);
  if (hasInvalidResourcePathShape(normalized)) {
    return null;
  }

  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 1) {
    return ROOT_RESOURCE_FILE_PATTERN.test(normalized) ? normalized : null;
  }

  if (!isAllowedNestedResourcePath(segments)) {
    return null;
  }

  return segments.join("/");
};

/**
 * Applies explicit input normalization for embedded/web extraction mode.
 *
 * @param content - Raw SKILL.md content candidate.
 * @param mode - Parser input mode.
 * @returns Normalized content according to the selected mode.
 */
const normalizeContentForMode = (
  content: SkillContent,
  mode: ParseFrontmatterInputMode,
): SkillContent => {
  if (mode !== INPUT_MODE_EMBEDDED) {
    return content;
  }

  const withoutBom = content.startsWith(UTF8_BOM) ? content.slice(1) : content;
  return withoutBom.trimStart();
};

/**
 * Validates a required trimmed string field.
 *
 * @param metadata - Parsed frontmatter object.
 * @param field - Required field name.
 * @returns Trimmed field value.
 * @throws {ValidationError} If the field is missing or not a non-empty string.
 */
const readRequiredTrimmedString = (
  metadata: Record<string, unknown>,
  field: keyof Pick<SkillFrontmatter, "name" | "description">,
  sourceStrings: Partial<Record<(typeof SCALAR_SOURCE_FIELDS)[number], string>>,
): string => {
  if (!(field in metadata)) {
    throw new ValidationError(`Missing required field in frontmatter: ${field}`);
  }

  const value = sourceStrings[field] ?? metadata[field];
  if (!isString(value) || !value.trim()) {
    throw new ValidationError(`Field '${field}' must be a non-empty string`);
  }

  return value.trim();
};

/**
 * Validates and reads an optional string frontmatter field.
 *
 * @param metadata - Parsed frontmatter object.
 * @param field - Optional field name.
 * @returns String value when present, otherwise `undefined`.
 * @throws {ValidationError} If the field is present and not a string.
 */
const readOptionalString = (
  metadata: Record<string, unknown>,
  field: typeof FIELD_LICENSE | typeof FIELD_COMPATIBILITY | typeof FIELD_ALLOWED_TOOLS,
  sourceStrings: Partial<Record<(typeof SCALAR_SOURCE_FIELDS)[number], string>>,
): string | undefined => {
  if (!(field in metadata)) {
    return undefined;
  }

  const value = sourceStrings[field] ?? metadata[field];
  if (!isString(value)) {
    throw new ValidationError(`Field '${field}' must be a string`);
  }

  return value;
};

/**
 * Converts parsed YAML metadata into the typed frontmatter model.
 *
 * @param metadataObject - Raw frontmatter object.
 * @param metadataMap - Normalized metadata string map from the YAML AST.
 * @returns Typed frontmatter representation.
 */
const toSkillFrontmatter = <TMetadata extends SkillMetadataMap>(
  metadataObject: Record<string, unknown>,
  metadataMap: SkillMetadataMap | null,
  sourceStrings: Partial<Record<(typeof SCALAR_SOURCE_FIELDS)[number], string>>,
): SkillFrontmatter<TMetadata> & Record<string, unknown> => {
  const normalizedFrontmatter: SkillFrontmatter<TMetadata> = {
    name: readRequiredTrimmedString(metadataObject, FIELD_NAME, sourceStrings),
    description: readRequiredTrimmedString(metadataObject, FIELD_DESCRIPTION, sourceStrings),
  };

  const frontmatter: SkillFrontmatter<TMetadata> & Record<string, unknown> = {
    ...metadataObject,
    ...normalizedFrontmatter,
  };

  const license = readOptionalString(metadataObject, FIELD_LICENSE, sourceStrings);
  if (license !== undefined) {
    frontmatter.license = license;
  }

  const compatibility = readOptionalString(metadataObject, FIELD_COMPATIBILITY, sourceStrings);
  if (compatibility !== undefined) {
    frontmatter.compatibility = compatibility;
  }

  const allowedTools = readOptionalString(metadataObject, FIELD_ALLOWED_TOOLS, sourceStrings);
  if (allowedTools !== undefined) {
    frontmatter["allowed-tools"] = allowedTools;
  }

  if (metadataMap !== null && isMetadataMap<TMetadata>(metadataMap)) {
    frontmatter.metadata = metadataMap;
  }

  return frontmatter;
};

/**
 * Converts a YAML scalar to the canonical metadata string form.
 *
 * @param value - Scalar node from the metadata map.
 * @returns String representation matching `skills-ref` behavior.
 */
const formatMetadataScalar = (value: Scalar): string => {
  const scalarValue = value.value;

  if (typeof scalarValue !== "string" && typeof value.source === "string") {
    return value.source;
  }

  if (typeof scalarValue === "string") {
    return scalarValue;
  }

  return JSON.stringify(scalarValue) ?? "";
};

/**
 * Extracts and string-normalizes the `metadata` map from a YAML document AST.
 *
 * @param document - Parsed YAML document.
 * @returns A metadata map when present; otherwise `null`.
 */
const extractMetadataStringMap = (document: Document.Parsed): SkillMetadataMap | null => {
  const root = document.contents;
  if (!isMapNode(root)) {
    return null;
  }

  const metadataPair = findMetadataPair(root);
  if (!metadataPair) {
    return null;
  }
  if (!isMapNode(metadataPair.value)) {
    throw new ValidationError("Field 'metadata' must be a YAML mapping");
  }

  return entriesToRecord(metadataPair.value.items.map(metadataItemToStringEntry));
};

const findFrontmatterPair = (
  root: YAMLMap,
  field: string,
): (typeof root.items)[number] | undefined => {
  for (const pair of root.items) {
    if (isScalarNode(pair.key) && pair.key.value === field) {
      return pair;
    }
  }
  return undefined;
};

const findMetadataPair = (root: YAMLMap): (typeof root.items)[number] | undefined =>
  findFrontmatterPair(root, FIELD_METADATA);

const extractFrontmatterScalarSourceStrings = (
  document: Document.Parsed,
): Partial<Record<(typeof SCALAR_SOURCE_FIELDS)[number], string>> => {
  const root = document.contents;
  if (!isMapNode(root)) {
    return {};
  }

  const sourceStrings: Partial<Record<(typeof SCALAR_SOURCE_FIELDS)[number], string>> = {};
  for (const field of SCALAR_SOURCE_FIELDS) {
    const value = findFrontmatterPair(root, field)?.value;
    if (isScalarNode(value)) {
      sourceStrings[field] = formatMetadataScalar(value);
    }
  }
  return sourceStrings;
};

const metadataItemToStringEntry = (item: YAMLMap["items"][number]): [string, string] => {
  if (!isScalarNode(item.key)) {
    throw new ValidationError("Field 'metadata' must contain scalar keys");
  }
  if (typeof item.key.value !== "string") {
    throw new ValidationError("Field 'metadata' must contain string keys");
  }

  if (item.value === null) {
    return [item.key.value, ""];
  }

  if (!isScalarNode(item.value)) {
    throw new ValidationError("Field 'metadata' must contain scalar values");
  }

  return [item.key.value, formatMetadataScalar(item.value)];
};

const hasUnsupportedStrictYamlFeature = (document: Document.Parsed): boolean => {
  let unsupported = false;
  const reject = (): symbol => {
    unsupported = true;
    return YAML.visit.BREAK;
  };

  YAML.visit(document, {
    Alias: reject,
    Collection: (_key, node) =>
      node.flow === true || typeof node.anchor === "string" || typeof node.tag === "string"
        ? reject()
        : undefined,
    Scalar: (_key, node) =>
      typeof node.anchor === "string" || typeof node.tag === "string" ? reject() : undefined,
  });

  return unsupported;
};

/**
 * Finds SKILL.md in a list of file entries, preferring uppercase over lowercase.
 *
 * @param files - File entries from any storage backend.
 * @returns The selected `SKILL.md` entry, or `null` when not found.
 * @example
 * ```ts
 * const entry = findSkillMdFile([
 *   { name: "skill.md", content: "..." },
 *   { name: "SKILL.md", content: "..." }
 * ])
 * ```
 * @see https://agentskills.io/specification
 * @see https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/parser.py
 */
export function findSkillMdFile<T extends Pick<SkillContentEntry, "name">>(
  files: Iterable<T>,
): T | null {
  let lowercaseMatch: T | null = null;

  for (const file of files) {
    if (file.name === "SKILL.md") {
      return file;
    }
    if (file.name === "skill.md") {
      lowercaseMatch = file;
    }
  }

  return lowercaseMatch;
}

/**
 * Options for `readSkillProperties`.
 */
export interface ReadSkillPropertiesOptions {
  /** Optional label used in parse errors when `SKILL.md` is missing. */
  location?: string;
}

/**
 * Reads and parses the SKILL.md content from an in-memory file list.
 * The lookup mirrors the reference behavior by preferring SKILL.md over skill.md.
 *
 * @param files - File entries that may contain `SKILL.md`.
 * @param options - Optional location label for parse errors.
 * @returns Parsed `SkillProperties`.
 * @throws {ParseError} If `SKILL.md` cannot be located.
 * @throws {ValidationError} If required frontmatter fields are missing or invalid.
 * @example
 * ```ts
 * const properties = readSkillProperties([
 *   { name: "SKILL.md", content: "---\nname: demo\ndescription: Demo\n---" }
 * ])
 * ```
 * @see https://agentskills.io/specification
 * @see https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/parser.py
 */
export function readSkillProperties<
  T extends SkillContentEntry,
  TMetadata extends SkillMetadataMap = SkillMetadataMap,
>(files: Iterable<T>, options: ReadSkillPropertiesOptions = {}): SkillProperties<TMetadata> {
  const skillFile = findSkillMdFile(files);
  if (!skillFile) {
    const locationLabel = options.location ? ` in ${options.location}` : "";
    throw new ParseError(`SKILL.md not found${locationLabel}`);
  }

  const { properties } = parseSkillContent<TMetadata>(skillFile.content);
  return properties;
}

/**
 * Converts hyphenated frontmatter keys into a JS-friendly properties shape.
 *
 * @param metadata - Parsed frontmatter using spec keys.
 * @returns Camel-cased `SkillProperties` representation.
 * @example
 * ```ts
 * const properties = frontmatterToProperties({
 *   name: "demo",
 *   description: "Demo skill",
 *   "allowed-tools": "Bash(git:*)"
 * })
 * ```
 * @see https://agentskills.io/specification
 * @see https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/models.py
 */
export function frontmatterToProperties<TMetadata extends SkillMetadataMap = SkillMetadataMap>(
  metadata: SkillFrontmatter<TMetadata>,
): SkillProperties<TMetadata> {
  return {
    name: metadata.name,
    description: metadata.description,
    license: metadata.license,
    compatibility: metadata.compatibility,
    allowedTools: metadata["allowed-tools"],
    metadata: metadata.metadata,
  };
}

/**
 * Frontmatter parser options.
 *
 * `strict` follows the specification and reference parser behavior exactly:
 * content must start with `---`.
 *
 * `embedded` is an explicit host opt-in for web extraction contexts where
 * content may have a leading BOM or whitespace before frontmatter.
 */
export interface ParseFrontmatterOptions {
  /**
   * Input handling mode.
   * - `strict` (default): parse exactly as provided.
   * - `embedded`: remove UTF-8 BOM and leading whitespace before strict parse.
   */
  inputMode?: ParseFrontmatterInputMode;
}

/**
 * Supported parse modes for frontmatter input handling.
 */
export type ParseFrontmatterInputMode = typeof INPUT_MODE_STRICT | typeof INPUT_MODE_EMBEDDED;

/**
 * Parsed resource reference discovered in a skill body markdown link.
 */
export interface ResourceLink {
  /** Display identifier from markdown link text. */
  name: SkillResource["name"];
  /** Canonical resource path under an observed skill-local resource directory. */
  path: SkillResource["path"];
}

const appendResourceLink = (
  links: ResourceLink[],
  dedupe: Set<string>,
  name: SkillResource["name"],
  path: SkillResource["path"],
): boolean => {
  const dedupeKey = `${name}${RESOURCE_DEDUPE_SEPARATOR}${path}`;
  if (dedupe.has(dedupeKey)) {
    return false;
  }

  dedupe.add(dedupeKey);
  links.push({ name, path });
  return true;
};

const collectMarkdownResourceLinks = (
  body: SkillBody,
  links: ResourceLink[],
  dedupe: Set<string>,
): Set<string> => {
  const linkedPaths = new Set<string>();

  for (const match of body.matchAll(MARKDOWN_RESOURCE_LINK_PATTERN)) {
    const rawName = match[1]?.trim() ?? "";
    const rawPath = match[2] ?? "";
    const normalizedPath = normalizeResourcePath(stripMarkdownLinkTitle(rawPath));
    if (!rawName || !normalizedPath) {
      continue;
    }

    if (appendResourceLink(links, dedupe, rawName, normalizedPath)) {
      linkedPaths.add(normalizedPath);
    }
  }

  return linkedPaths;
};

const collectBareResourceLinks = (
  body: SkillBody,
  links: ResourceLink[],
  dedupe: Set<string>,
  linkedPaths: Set<string>,
): void => {
  for (const match of body.matchAll(BARE_RESOURCE_PATH_PATTERN)) {
    const start = match.index ?? -1;
    const normalizedPath = normalizeResourcePath(stripBareResourceTrailingPunctuation(match[0]));
    if (
      !hasBareResourcePathBoundary(body, start) ||
      !normalizedPath ||
      linkedPaths.has(normalizedPath)
    ) {
      continue;
    }

    appendResourceLink(links, dedupe, normalizedPath, normalizedPath);
  }
};

/**
 * Extracts tier-3 resource links from skill body markdown.
 *
 * Only links to observed skill-local resource directories are returned.
 * External URLs, anchors, and path traversal references are ignored.
 * Leading `./` is accepted and normalized away.
 *
 * @param body - Skill markdown body (without frontmatter).
 * @returns De-duplicated list of resource links.
 */
export function extractResourceLinks(body: SkillBody): ResourceLink[] {
  const links: ResourceLink[] = [];
  const dedupe = new Set<string>();
  const linkedPaths = collectMarkdownResourceLinks(body, links, dedupe);
  collectBareResourceLinks(body, links, dedupe, linkedPaths);
  return links;
}

/**
 * Parse YAML frontmatter from SKILL.md content.
 *
 * @param content - Raw content of SKILL.md file
 * @param options - Optional parsing mode. Defaults to strict spec behavior.
 * @returns Parsed frontmatter metadata and trimmed markdown body.
 * @throws {ParseError} If frontmatter is missing or invalid
 * @throws {ValidationError} If required fields are missing or invalid
 * @example
 * ```ts
 * const { metadata, body } = parseFrontmatter(`---
 * name: demo
 * description: Demo skill
 * ---
 * # Instructions`)
 * ```
 * @see https://agentskills.io/specification
 * @see https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/parser.py
 *
 * Spec: https://agentskills.io/specification
 * - File must start with `---`
 * - Frontmatter must be closed with second `---`
 * - YAML must be valid mapping (object)
 * - Required fields: name, description
 * - Required fields must be non-empty strings
 */
export function parseFrontmatter<TMetadata extends SkillMetadataMap = SkillMetadataMap>(
  content: SkillContent,
  options: ParseFrontmatterOptions = {},
): SkillFrontmatterParseResult<TMetadata> {
  const normalizedContent = normalizeContentForMode(
    content,
    options.inputMode ?? INPUT_MODE_STRICT,
  );

  if (!normalizedContent.startsWith(FRONTMATTER_DELIMITER)) {
    throw new ParseError("SKILL.md must start with YAML frontmatter (---)");
  }

  const secondDelimiter = normalizedContent.indexOf(
    FRONTMATTER_DELIMITER,
    FRONTMATTER_DELIMITER_LENGTH,
  );

  if (secondDelimiter === -1) {
    throw new ParseError("SKILL.md frontmatter not properly closed with ---");
  }

  const frontmatterStr = normalizedContent.substring(FRONTMATTER_DELIMITER_LENGTH, secondDelimiter);
  const body = normalizedContent.substring(secondDelimiter + FRONTMATTER_DELIMITER_LENGTH).trim();

  const document = YAML.parseDocument(frontmatterStr, { keepSourceTokens: true });
  if (document.errors.length > 0) {
    const errorMessage = document.errors.at(0)?.message ?? "Unknown YAML parse error";
    throw new ParseError(`Invalid YAML in frontmatter: ${errorMessage}`);
  }

  if (hasUnsupportedStrictYamlFeature(document)) {
    throw new ParseError(
      "Invalid YAML in frontmatter: flow collections, anchors, aliases, and tags are not supported",
    );
  }

  const metadataMap = extractMetadataStringMap(document);
  const sourceStrings = extractFrontmatterScalarSourceStrings(document);
  const rawMetadata = document.toJSON();

  if (!isRecord(rawMetadata)) {
    throw new ParseError("SKILL.md frontmatter must be a YAML mapping");
  }

  const metadataObject = rawMetadata;

  return {
    metadata: toSkillFrontmatter<TMetadata>(metadataObject, metadataMap, sourceStrings),
    body,
  };
}

/**
 * Extract markdown body from SKILL.md content (strips frontmatter).
 *
 * @param content - Raw content of SKILL.md file
 * @returns Markdown body without frontmatter
 * @example
 * ```ts
 * const body = extractBody(`---\nname: demo\ndescription: Demo\n---\n# Body`)
 * ```
 * @see https://agentskills.io/specification
 * @see https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/parser.py
 *
 * If content doesn't have valid frontmatter, returns the content as-is.
 */
export function extractBody(content: SkillContent): SkillBody {
  if (!content.startsWith(FRONTMATTER_DELIMITER)) {
    return content.trim();
  }

  const secondDelimiter = content.indexOf(FRONTMATTER_DELIMITER, FRONTMATTER_DELIMITER_LENGTH);

  if (secondDelimiter === -1) {
    return content.trim();
  }

  return content.substring(secondDelimiter + FRONTMATTER_DELIMITER_LENGTH).trim();
}

/**
 * Parse SKILL.md content into SkillProperties.
 *
 * @param content - Raw content of SKILL.md file
 * @param options - Optional frontmatter parsing mode.
 * @returns SkillProperties with parsed metadata and body
 * @throws {ParseError} If SKILL.md has invalid format
 * @throws {ValidationError} If required fields are missing
 * @example
 * ```ts
 * const parsed = parseSkillContent(`---
 * name: demo
 * description: Demo skill
 * ---
 * # Instructions`)
 * ```
 * @see https://agentskills.io/specification
 * @see https://github.com/agentskills/agentskills/blob/main/skills-ref/src/skills_ref/parser.py
 *
 * Spec: https://agentskills.io/specification
 */
export function parseSkillContent<TMetadata extends SkillMetadataMap = SkillMetadataMap>(
  content: SkillContent,
  options: ParseFrontmatterOptions = {},
): SkillParseResult<TMetadata> {
  const { metadata, body } = parseFrontmatter<TMetadata>(content, options);

  return { properties: frontmatterToProperties(metadata), body };
}
