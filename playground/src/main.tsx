import {
  AlertCircle,
  Code2,
  CheckCircle2,
  Copy,
  Database,
  Eye,
  Play,
  RefreshCcw,
  Save,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { Markdown } from "@copilotkit/react-ui";
// @ts-ignore Vite handles CSS side-effect imports in the playground build.
import "@copilotkit/react-ui/styles.css";
import { StrictMode, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  estimateTokens,
  parseSkillContent,
  toPrompt,
  validateSkillContent,
  type SkillProperties,
} from "../../src/index.ts";
// @ts-ignore Vite handles CSS side-effect imports in the playground build.
import "./styles.css";

type SkillFormData = {
  allowedTools: string;
  body: string;
  compatibility: string;
  description: string;
  license: string;
  name: string;
};

type ExampleSkill = {
  content: string;
  description: string;
  id: string;
  name: string;
};

type BrowserValidationResult = {
  bodyLength?: number;
  error?: string;
  ok: boolean;
  prompt?: string;
  properties?: SkillProperties;
  tokens?: number;
  validationErrors: string[];
};

type SavedSkill = {
  content: string;
  description: string;
  id: string;
  name: string;
  tokens: number;
  updatedAt: number;
};

type MockChatMessage = {
  content: string;
  id: string;
  role: "assistant" | "tool" | "user";
};

type PreviewMode = "raw" | "visual";

declare global {
  interface Window {
    __agentSkillsPlaygroundRoot?: Root;
  }
}

const skillDbName = "agent-skills-ts-sdk-playground";
const skillDbVersion = 1;
const skillsStoreName = "skills";

const sampleSkills: ExampleSkill[] = [
  {
    id: "readme-writer",
    name: "readme-writer",
    description: "Drafts README updates for TypeScript package maintainers.",
    content: `---
name: readme-writer
description: Draft README sections for TypeScript package maintainers when public docs need clearer installation, usage, API, or release guidance.
license: MIT
compatibility: Works best in npm package repositories with package.json and TypeScript source.
allowed-tools: Read Grep Glob
---
# README Writer

Use this skill when README changes need to explain a TypeScript package to users.

## Workflow

1. Read \`package.json\`, the public exports, and existing README sections.
2. Identify the reader: evaluator, first-time user, contributor, or maintainer.
3. Keep install and first-use examples short enough to run in one sitting.
4. Name compatibility constraints directly.
5. Prefer concrete examples over broad claims.

## Output

Return replacement-ready Markdown and call out any facts that need maintainer confirmation.
`,
  },
  {
    id: "cloudflare-worker-review",
    name: "cloudflare-worker-review",
    description:
      "Reviews Cloudflare Worker code for deployable request handling and package-demo clarity.",
    content: `---
name: cloudflare-worker-review
description: Review Cloudflare Worker examples for small SDK repos before publishing demos or docs.
compatibility: Cloudflare Workers, Vite, and TypeScript.
allowed-tools: Read Grep Bash(npm:*) Bash(pnpm:*)
---
# Cloudflare Worker Review

Check that the Worker example is easy to run and demonstrates the package without hiding important code.

## Review Points

- The Worker should expose a narrow, inspectable API.
- Responses should include status codes and JSON content types.
- The example should avoid production-only configuration.
- The README should explain local development and deployment separately.
`,
  },
];

const defaultSkill: SkillFormData = {
  allowedTools: "Read Grep Bash(pnpm:*)",
  body: `# Skill Editor Demo

Use this skill when you need to inspect, validate, or refine a SKILL.md file.

## Workflow

1. Confirm the skill name and description match the behavior.
2. Check validation errors before saving.
3. Preview the prompt metadata that an agent sees.
4. Keep detailed instructions in the body, not in the description.
`,
  compatibility: "Works with AgentSkills-compatible hosts.",
  description:
    "Inspect and refine SKILL.md files with live parsing, validation, prompt previews, and patch output.",
  license: "MIT",
  name: "skill-editor-demo",
};

function App() {
  const [formData, setFormData] = useState(defaultSkill);
  const [savedContent, setSavedContent] = useState(() => assembleSkillContent(defaultSkill));
  const [examples] = useState<ExampleSkill[]>(sampleSkills);
  const [savedSkills, setSavedSkills] = useState<SavedSkill[]>([]);
  const [browserResult, setBrowserResult] = useState<BrowserValidationResult | null>(null);
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const [skillPreviewMode, setSkillPreviewMode] = useState<PreviewMode>("raw");
  const [mockMessages, setMockMessages] = useState<MockChatMessage[]>(() =>
    createInitialMockMessages(defaultSkill),
  );
  const [copied, setCopied] = useState<"content" | null>(null);

  const content = useMemo(() => assembleSkillContent(formData), [formData]);
  const parsed = useMemo(() => parseContent(content), [content]);
  const validationErrors = useMemo(() => validateSkillContent(content), [content]);
  const promptPreview = useMemo(() => {
    if (!parsed.ok) return "";
    return toPrompt([{ content, location: "playground/SKILL.md" }]);
  }, [content, parsed.ok]);
  const tokenEstimate = useMemo(() => estimateTokens(content), [content]);
  const hasChanges = content !== savedContent;
  const isValid = parsed.ok && validationErrors.length === 0;

  useEffect(() => {
    void refreshSavedSkills(setSavedSkills);
  }, []);

  const updateField = useCallback(
    (field: keyof SkillFormData) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData((current) => ({ ...current, [field]: event.target.value }));
        setBrowserResult(null);
      },
    [],
  );

  const loadExample = useCallback(async (id: string) => {
    const example = sampleSkills.find((skill) => skill.id === id);
    if (example) {
      const next = parseToFormData(example.content);
      setFormData(next);
      setSavedContent(example.content);
      setBrowserResult(null);
      setStorageMessage(`Loaded ${next.name} sample`);
      setMockMessages(createInitialMockMessages(next));
    }
  }, []);

  const resetSkill = useCallback(() => {
    setFormData(defaultSkill);
    setSavedContent(assembleSkillContent(defaultSkill));
    setBrowserResult(null);
    setStorageMessage(null);
    setMockMessages(createInitialMockMessages(defaultSkill));
  }, []);

  const validateInBrowser = useCallback(() => {
    const result = {
      bodyLength: parsed.ok ? parsed.body.length : undefined,
      error: parsed.ok ? undefined : parsed.error,
      ok: parsed.ok && validationErrors.length === 0,
      prompt: promptPreview,
      properties: parsed.ok ? parsed.properties : undefined,
      tokens: tokenEstimate,
      validationErrors,
    } satisfies BrowserValidationResult;
    setBrowserResult(result);
    return result;
  }, [parsed, promptPreview, tokenEstimate, validationErrors]);

  const saveSnapshot = useCallback(async () => {
    const record = createSavedSkillRecord(content, formData);
    await putSavedSkill(record);
    await refreshSavedSkills(setSavedSkills);
    setSavedContent(content);
    setStorageMessage(`Saved ${record.name} to IndexedDB`);
  }, [content, formData]);

  const loadSavedSkill = useCallback(async (skill: SavedSkill) => {
    const next = parseToFormData(skill.content);
    setFormData(next);
    setSavedContent(skill.content);
    setBrowserResult(null);
    setStorageMessage(`Loaded ${skill.name} from IndexedDB`);
    setMockMessages(createInitialMockMessages(next));
  }, []);

  const deleteSavedSkill = useCallback(async (skill: SavedSkill) => {
    await deleteSkillRecord(skill.id);
    await refreshSavedSkills(setSavedSkills);
    setStorageMessage(`Deleted ${skill.name} from IndexedDB`);
  }, []);

  const copySkill = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied("content");
    window.setTimeout(() => setCopied(null), 1200);
  }, [content]);

  const runMockAgent = useCallback(() => {
    const result = validateInBrowser();
    setMockMessages(
      createMockAgentMessages(
        formData,
        content,
        promptPreview,
        result.validationErrors,
        result.error,
      ),
    );
  }, [content, formData, promptPreview, validateInBrowser]);

  return (
    <main className="min-h-dvh bg-background p-4 text-foreground sm:p-6">
      <section
        className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.8fr)]"
        aria-label="Skill editor and agent mock"
      >
        <section className="min-w-0 space-y-4" aria-label="Skill editor">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-mono text-xs font-semibold text-muted-foreground">
                agent-skills-ts-sdk
              </p>
              <h1 className="text-2xl font-bold tracking-tight">Skill editor</h1>
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Current validation status">
              <StatusPill tone={isValid ? "success" : "error"}>
                {isValid ? "Valid" : "Needs work"}
              </StatusPill>
              <StatusPill tone="neutral">{tokenEstimate} tokens</StatusPill>
              <StatusPill tone={hasChanges ? "warn" : "neutral"}>
                {hasChanges ? "Unsaved" : "Saved"}
              </StatusPill>
            </div>
          </header>

          <section className="min-w-0 rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap gap-2" aria-label="Editor actions">
              <button
                className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted/50"
                type="button"
                onClick={resetSkill}
                title="Reset skill"
              >
                <RefreshCcw size={16} />
                Reset
              </button>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted/50"
                type="button"
                onClick={() => void loadExample(examples[0].id)}
              >
                <WandSparkles size={16} />
                README skill
              </button>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted/50"
                type="button"
                onClick={() => void loadExample(examples[1].id)}
              >
                <WandSparkles size={16} />
                Worker skill
              </button>
            </div>

            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <Field label="Name" detail={`${formData.name.length}/64`}>
                <input
                  className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                  data-mono="true"
                  value={formData.name}
                  onChange={updateField("name")}
                  spellCheck={false}
                />
              </Field>
              <Field label="License">
                <input
                  className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                  value={formData.license}
                  onChange={updateField("license")}
                />
              </Field>
              <Field label="Description" detail={`${formData.description.length}/1024`} wide>
                <textarea
                  className="min-h-20 w-full min-w-0 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                  value={formData.description}
                  onChange={updateField("description")}
                />
              </Field>
              <Field label="Compatibility" detail={`${formData.compatibility.length}/500`} wide>
                <input
                  className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                  value={formData.compatibility}
                  onChange={updateField("compatibility")}
                />
              </Field>
              <Field label="Allowed tools" wide>
                <input
                  className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                  data-mono="true"
                  value={formData.allowedTools}
                  onChange={updateField("allowedTools")}
                />
              </Field>
              <Field label="Instructions" wide>
                <textarea
                  className="min-h-[240px] w-full min-w-0 resize-y rounded-md border bg-background px-3 py-2 font-mono text-sm leading-6 outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                  data-mono="true"
                  value={formData.body}
                  onChange={updateField("body")}
                  spellCheck={false}
                />
              </Field>
            </div>
          </section>

          <section
            className="min-w-0 rounded-lg border bg-card p-4 shadow-sm"
            aria-label="IndexedDB storage"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Database className="size-4 text-muted-foreground" />
                IndexedDB
              </h2>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                type="button"
                onClick={() => void saveSnapshot()}
              >
                <Save size={16} />
                Save
              </button>
            </div>
            {storageMessage ? (
              <p className="mb-3 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {storageMessage}
              </p>
            ) : null}
            <div className="grid max-h-36 gap-2 overflow-auto">
              {savedSkills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved skills yet.</p>
              ) : (
                savedSkills.map((skill) => (
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2" key={skill.id}>
                    <button
                      className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/50"
                      type="button"
                      onClick={() => void loadSavedSkill(skill)}
                    >
                      <span className="grid min-w-0 gap-0.5">
                        <strong className="truncate text-sm font-medium">{skill.name}</strong>
                        <small className="truncate text-xs text-muted-foreground">
                          {new Date(skill.updatedAt).toLocaleString()}
                        </small>
                      </span>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {skill.tokens}
                      </code>
                    </button>
                    <button
                      className="inline-flex size-9 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                      type="button"
                      onClick={() => void deleteSavedSkill(skill)}
                      title={`Delete ${skill.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section
            className="min-w-0 rounded-lg border bg-card p-4 shadow-sm"
            aria-label="SKILL.md preview"
          >
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold">SKILL.md</h2>
              <div className="flex flex-wrap gap-2">
                <div
                  className="inline-flex rounded-md border bg-muted p-1"
                  aria-label="SKILL.md preview mode"
                >
                  <button
                    className={previewButtonClass(skillPreviewMode === "raw")}
                    type="button"
                    onClick={() => setSkillPreviewMode("raw")}
                  >
                    <Code2 size={15} />
                    Raw
                  </button>
                  <button
                    className={previewButtonClass(skillPreviewMode === "visual")}
                    type="button"
                    onClick={() => setSkillPreviewMode("visual")}
                  >
                    <Eye size={15} />
                    Visual
                  </button>
                </div>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted/50"
                  type="button"
                  onClick={() => void copySkill()}
                >
                  <Copy size={15} />
                  {copied === "content" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            {skillPreviewMode === "raw" ? (
              <pre className="max-h-[420px] overflow-auto rounded-md bg-foreground p-4 text-xs leading-5 text-background">
                {content}
              </pre>
            ) : (
              <SkillVisual parsed={parsed} validationErrors={validationErrors} />
            )}
          </section>
        </section>

        <section
          className="flex min-h-[680px] min-w-0 flex-col overflow-hidden rounded-lg border bg-card p-4 shadow-sm lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)]"
          aria-label="CopilotKit mock agent"
        >
          <header className="mb-4 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="font-mono text-xs font-semibold text-muted-foreground">
                CopilotKit UI mock
              </p>
              <h1 className="text-2xl font-bold tracking-tight">Agent run</h1>
            </div>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              type="button"
              onClick={runMockAgent}
            >
              <Play size={16} />
              Run with skill
            </button>
          </header>

          <section
            className="mb-4 flex items-start gap-3 rounded-lg border bg-muted/50 p-3"
            aria-label="Browser validation result"
          >
            {isValid ? (
              <CheckCircle2 className="mt-0.5 size-4 text-success" />
            ) : (
              <AlertCircle className="mt-0.5 size-4 text-destructive" />
            )}
            <div className="min-w-0 space-y-0.5">
              <strong className="text-sm font-medium">
                {isValid
                  ? "Browser validation ready"
                  : "Fix validation before relying on this skill"}
              </strong>
              <p className="text-sm text-muted-foreground">
                {browserResult
                  ? `${browserResult.tokens ?? tokenEstimate} tokens checked in browser`
                  : "Run starts by validating the current SKILL.md locally."}
              </p>
            </div>
          </section>

          <div
            className="grid min-h-0 flex-1 content-start gap-3 overflow-auto rounded-lg border bg-background p-4"
            aria-label="Mock CopilotKit chat transcript"
          >
            {mockMessages.map((message) => (
              <div className={mockMessageClass(message.role)} key={message.id}>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {message.role === "tool" ? "read_skill tool" : message.role}
                </span>
                <div className="text-sm leading-6 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:bg-muted/70 [&_pre]:p-3 [&_ul]:ml-5 [&_ul]:list-disc">
                  <Markdown content={message.content} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function Field({
  children,
  detail,
  label,
  wide = false,
}: {
  children: ReactNode;
  detail?: string;
  label: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "grid min-w-0 gap-2 sm:col-span-2" : "grid min-w-0 gap-2"}>
      <span className="flex items-center justify-between gap-3 text-sm font-medium">
        {label}
        {detail ? (
          <small className="font-mono text-xs text-muted-foreground tabular-nums">{detail}</small>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "error" | "neutral" | "success" | "warn";
}) {
  return <span className={statusPillClass(tone)}>{children}</span>;
}

function statusPillClass(tone: "error" | "neutral" | "success" | "warn"): string {
  const base =
    "inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold tabular-nums";
  if (tone === "success") return `${base} border-success/30 bg-success/10 text-success`;
  if (tone === "error") return `${base} border-destructive/30 bg-destructive/10 text-destructive`;
  if (tone === "warn") return `${base} border-warning/40 bg-warning/10 text-warning-foreground`;
  return `${base} bg-card text-muted-foreground`;
}

function previewButtonClass(active: boolean): string {
  return [
    "inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors",
    active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
  ].join(" ");
}

function mockMessageClass(role: MockChatMessage["role"]): string {
  const base = "grid gap-2 rounded-lg border p-3";
  if (role === "user") return `${base} ml-auto max-w-[85%] bg-secondary text-secondary-foreground`;
  if (role === "tool") return `${base} bg-muted/50`;
  return `${base} max-w-[92%] bg-card`;
}

function SkillVisual({
  parsed,
  validationErrors,
}: {
  parsed: ReturnType<typeof parseContent>;
  validationErrors: string[];
}) {
  if (!parsed.ok) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        <strong className="text-sm font-medium">Unable to render SKILL.md</strong>
        <p className="mt-1 text-sm">{parsed.error}</p>
      </div>
    );
  }

  const properties = parsed.properties;

  return (
    <div className="grid max-h-[420px] gap-4 overflow-auto rounded-md border bg-background p-4">
      <div className="grid gap-x-4 gap-y-2 rounded-md border bg-card p-3 text-sm sm:grid-cols-[120px_minmax(0,1fr)]">
        <span className="font-medium text-muted-foreground">Name</span>
        <strong className="min-w-0">{properties.name}</strong>
        <span className="font-medium text-muted-foreground">Description</span>
        <p className="min-w-0">{properties.description}</p>
        {properties.compatibility ? (
          <>
            <span className="font-medium text-muted-foreground">Compatibility</span>
            <p className="min-w-0">{properties.compatibility}</p>
          </>
        ) : null}
        {properties.allowedTools ? (
          <>
            <span className="font-medium text-muted-foreground">Allowed tools</span>
            <code className="min-w-0 rounded bg-muted px-1 py-0.5">{properties.allowedTools}</code>
          </>
        ) : null}
      </div>
      {validationErrors.length > 0 ? (
        <ValidationList errors={validationErrors} parseError={null} />
      ) : null}
      <MarkdownBody markdown={parsed.body} />
    </div>
  );
}

function MarkdownBody({ markdown }: { markdown: string }) {
  const blocks = parseMarkdownBlocks(markdown);

  return (
    <div className="grid gap-3 text-sm leading-6">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          const HeadingTag = `h${Math.min(block.level, 3)}` as "h1" | "h2" | "h3";
          return (
            <HeadingTag className="font-semibold tracking-tight" key={`${block.kind}-${index}`}>
              {block.text}
            </HeadingTag>
          );
        }
        if (block.kind === "list") {
          return (
            <ul className="ml-5 list-disc" key={`${block.kind}-${index}`}>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }
        if (block.kind === "code") {
          return (
            <pre
              className="overflow-auto rounded-md bg-muted p-3 text-xs"
              key={`${block.kind}-${index}`}
            >
              {block.text}
            </pre>
          );
        }
        return <p key={`${block.kind}-${index}`}>{block.text}</p>;
      })}
    </div>
  );
}

function ValidationList({ errors, parseError }: { errors: string[]; parseError: string | null }) {
  const allErrors = [...(parseError ? [parseError] : []), ...errors];

  if (allErrors.length === 0) {
    return (
      <p className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
        No validation errors.
      </p>
    );
  }

  return (
    <ul className="grid gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-5 py-3 text-sm text-destructive">
      {allErrors.map((error) => (
        <li key={error}>{error}</li>
      ))}
    </ul>
  );
}

function parseContent(
  content: string,
): { body: string; ok: true; properties: SkillProperties } | { error: string; ok: false } {
  try {
    return { ok: true, ...parseSkillContent(content) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function parseToFormData(content: string): SkillFormData {
  const parsed = parseSkillContent(content);

  return {
    allowedTools: parsed.properties.allowedTools ?? "",
    body: parsed.body.trim(),
    compatibility: parsed.properties.compatibility ?? "",
    description: parsed.properties.description,
    license: parsed.properties.license ?? "",
    name: parsed.properties.name,
  };
}

function assembleSkillContent(data: SkillFormData): string {
  const lines = ["---", `name: ${data.name}`, `description: ${quoteYaml(data.description)}`];

  if (data.license.trim()) lines.push(`license: ${quoteYaml(data.license)}`);
  if (data.compatibility.trim()) lines.push(`compatibility: ${quoteYaml(data.compatibility)}`);
  if (data.allowedTools.trim()) lines.push(`allowed-tools: ${quoteYaml(data.allowedTools)}`);

  lines.push("---", "", data.body.trim());
  return `${lines.join("\n")}\n`;
}

function quoteYaml(value: string): string {
  return JSON.stringify(value.trim());
}

type MarkdownBlock =
  | { kind: "code"; text: string }
  | { kind: "heading"; level: number; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string };

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.split("\n");
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let codeLines: string[] = [];
  let inCodeBlock = false;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ kind: "list", items: listItems });
      listItems = [];
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({ kind: "code", text: codeLines.join("\n") });
        codeLines = [];
        inCodeBlock = false;
      } else {
        flushParagraph();
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
      continue;
    }

    const listItem = /^\s*(?:[-*]|\d+\.)\s+(.+)$/.exec(line);
    if (listItem) {
      flushParagraph();
      listItems.push(listItem[1]);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  if (inCodeBlock) {
    blocks.push({ kind: "code", text: codeLines.join("\n") });
  }
  flushParagraph();
  flushList();

  return blocks;
}

function createSavedSkillRecord(content: string, fallback: SkillFormData): SavedSkill {
  const parsed = parseContent(content);
  const name = parsed.ok ? parsed.properties.name : fallback.name.trim() || "invalid-skill";
  const description = parsed.ok ? parsed.properties.description : fallback.description.trim();

  return {
    content,
    description,
    id: name,
    name,
    tokens: estimateTokens(content),
    updatedAt: Date.now(),
  };
}

function createInitialMockMessages(skill: SkillFormData): MockChatMessage[] {
  return [
    {
      content:
        "Ask the mock agent to use the current skill. The transcript is generated locally in the browser and rendered with CopilotKit's Markdown UI.",
      id: "assistant-initial",
      role: "assistant",
    },
    {
      content: `Use the \`${skill.name}\` skill for this request.`,
      id: "user-initial",
      role: "user",
    },
  ];
}

function createMockAgentMessages(
  skill: SkillFormData,
  content: string,
  promptPreview: string,
  validationErrors: string[],
  parseError?: string,
): MockChatMessage[] {
  const parsed = parseContent(content);
  const validationSummary =
    parsed.ok && validationErrors.length === 0
      ? "The skill validates successfully in the browser."
      : "The skill has validation issues, so the agent would ask for a fix before relying on it.";
  const toolSummary =
    parsed.ok && validationErrors.length === 0
      ? `Parsed \`${skill.name}\`, validated the SKILL.md, and exposed the prompt metadata.`
      : [
          `Tried to parse \`${skill.name}\` from browser state.`,
          parseError ? `Parser error: ${parseError}` : null,
          validationErrors.length > 0 ? `Validation errors: ${validationErrors.join("; ")}` : null,
        ]
          .filter(Boolean)
          .join("\n");

  return [
    {
      content: `Use the \`${skill.name}\` skill to help with a package README update.`,
      id: "user-run",
      role: "user",
    },
    {
      content: [toolSummary, "", "```xml", promptPreview || "<available_skills />", "```"].join(
        "\n",
      ),
      id: "tool-read-skill",
      role: "tool",
    },
    {
      content: [
        `I would activate **${skill.name}** because its description says:`,
        "",
        `> ${skill.description}`,
        "",
        validationSummary,
        "",
        "Using the skill, I would:",
        "",
        "- inspect the README audience and current package exports",
        "- keep the first runnable example short",
        "- call out compatibility and validation constraints",
        "- return replacement-ready Markdown rather than a vague summary",
      ].join("\n"),
      id: "assistant-run",
      role: "assistant",
    },
  ];
}

async function refreshSavedSkills(setSavedSkills: (skills: SavedSkill[]) => void): Promise<void> {
  const skills = await getSavedSkills();
  setSavedSkills(skills.sort((a, b) => b.updatedAt - a.updatedAt));
}

async function getSavedSkills(): Promise<SavedSkill[]> {
  const db = await openSkillDb();

  return new Promise((resolve, reject) => {
    const request = db
      .transaction(skillsStoreName, "readonly")
      .objectStore(skillsStoreName)
      .getAll();
    request.onsuccess = () => resolve(request.result as SavedSkill[]);
    request.onerror = () => reject(request.error);
  });
}

async function putSavedSkill(skill: SavedSkill): Promise<void> {
  const db = await openSkillDb();

  return new Promise((resolve, reject) => {
    const request = db
      .transaction(skillsStoreName, "readwrite")
      .objectStore(skillsStoreName)
      .put(skill);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function deleteSkillRecord(id: string): Promise<void> {
  const db = await openSkillDb();

  return new Promise((resolve, reject) => {
    const request = db
      .transaction(skillsStoreName, "readwrite")
      .objectStore(skillsStoreName)
      .delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function openSkillDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(skillDbName, skillDbVersion);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(skillsStoreName)) {
        db.createObjectStore(skillsStoreName, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found.");
}

const root = window.__agentSkillsPlaygroundRoot ?? createRoot(rootElement);
window.__agentSkillsPlaygroundRoot = root;

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
