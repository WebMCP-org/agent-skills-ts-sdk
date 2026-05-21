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
    <main className="app-shell">
      <section className="app-grid" aria-label="Skill editor and agent mock">
        <section className="editor-column" aria-label="Skill editor">
          <header className="compact-header">
            <div>
              <p className="eyebrow">agent-skills-ts-sdk</p>
              <h1>Skill editor</h1>
            </div>
            <div className="status-strip" aria-label="Current validation status">
              <StatusPill tone={isValid ? "success" : "error"}>
                {isValid ? "Valid" : "Needs work"}
              </StatusPill>
              <StatusPill tone="neutral">{tokenEstimate} tokens</StatusPill>
              <StatusPill tone={hasChanges ? "warn" : "neutral"}>
                {hasChanges ? "Unsaved" : "Saved"}
              </StatusPill>
            </div>
          </header>

          <section className="editor-surface">
            <div className="editor-toolbar" aria-label="Editor actions">
              <button type="button" onClick={resetSkill} title="Reset skill">
                <RefreshCcw size={16} />
                Reset
              </button>
              <button type="button" onClick={() => void loadExample(examples[0].id)}>
                <WandSparkles size={16} />
                README skill
              </button>
              <button type="button" onClick={() => void loadExample(examples[1].id)}>
                <WandSparkles size={16} />
                Worker skill
              </button>
            </div>

            <div className="form-grid simple-form">
              <Field label="Name" detail={`${formData.name.length}/64`}>
                <input value={formData.name} onChange={updateField("name")} spellCheck={false} />
              </Field>
              <Field label="License">
                <input value={formData.license} onChange={updateField("license")} />
              </Field>
              <Field label="Description" detail={`${formData.description.length}/1024`} wide>
                <textarea
                  className="short-textarea"
                  value={formData.description}
                  onChange={updateField("description")}
                />
              </Field>
              <Field label="Compatibility" detail={`${formData.compatibility.length}/500`} wide>
                <input value={formData.compatibility} onChange={updateField("compatibility")} />
              </Field>
              <Field label="Allowed tools" wide>
                <input value={formData.allowedTools} onChange={updateField("allowedTools")} />
              </Field>
              <Field label="Instructions" wide>
                <textarea
                  className="body-editor"
                  value={formData.body}
                  onChange={updateField("body")}
                  spellCheck={false}
                />
              </Field>
            </div>
          </section>

          <section className="editor-surface storage-surface" aria-label="IndexedDB storage">
            <div className="section-heading compact-line">
              <h2>
                <Database size={16} />
                IndexedDB
              </h2>
              <button
                className="primary-button compact-primary"
                type="button"
                onClick={() => void saveSnapshot()}
              >
                <Save size={16} />
                Save
              </button>
            </div>
            {storageMessage ? <p className="storage-message">{storageMessage}</p> : null}
            <div className="saved-list compact-saved-list">
              {savedSkills.length === 0 ? (
                <p className="empty-state">No saved skills yet.</p>
              ) : (
                savedSkills.map((skill) => (
                  <div className="saved-row" key={skill.id}>
                    <button type="button" onClick={() => void loadSavedSkill(skill)}>
                      <span>
                        <strong>{skill.name}</strong>
                        <small>{new Date(skill.updatedAt).toLocaleString()}</small>
                      </span>
                      <code>{skill.tokens}</code>
                    </button>
                    <button
                      className="icon-button"
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

          <section className="editor-surface markdown-surface" aria-label="SKILL.md preview">
            <div className="section-heading compact-line">
              <h2>SKILL.md</h2>
              <div className="button-row">
                <div className="segmented-control" aria-label="SKILL.md preview mode">
                  <button
                    className={skillPreviewMode === "raw" ? "active" : ""}
                    type="button"
                    onClick={() => setSkillPreviewMode("raw")}
                  >
                    <Code2 size={15} />
                    Raw
                  </button>
                  <button
                    className={skillPreviewMode === "visual" ? "active" : ""}
                    type="button"
                    onClick={() => setSkillPreviewMode("visual")}
                  >
                    <Eye size={15} />
                    Visual
                  </button>
                </div>
                <button
                  className="icon-label-button"
                  type="button"
                  onClick={() => void copySkill()}
                >
                  <Copy size={15} />
                  {copied === "content" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            {skillPreviewMode === "raw" ? (
              <pre className="skill-source">{content}</pre>
            ) : (
              <SkillVisual parsed={parsed} validationErrors={validationErrors} />
            )}
          </section>
        </section>

        <section className="agent-column" aria-label="CopilotKit mock agent">
          <header className="agent-header">
            <div>
              <p className="eyebrow">CopilotKit UI mock</p>
              <h1>Agent run</h1>
            </div>
            <button className="primary-button run-button" type="button" onClick={runMockAgent}>
              <Play size={16} />
              Run with skill
            </button>
          </header>

          <section className="agent-status" aria-label="Browser validation result">
            {isValid ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <div>
              <strong>
                {isValid
                  ? "Browser validation ready"
                  : "Fix validation before relying on this skill"}
              </strong>
              <span>
                {browserResult
                  ? `${browserResult.tokens ?? tokenEstimate} tokens checked in browser`
                  : "Run starts by validating the current SKILL.md locally."}
              </span>
            </div>
          </section>

          <div className="mock-chat agent-chat" aria-label="Mock CopilotKit chat transcript">
            {mockMessages.map((message) => (
              <div className={`mock-message ${message.role}`} key={message.id}>
                <span>{message.role === "tool" ? "read_skill tool" : message.role}</span>
                <Markdown content={message.content} />
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
    <label className={wide ? "field wide" : "field"}>
      <span>
        {label}
        {detail ? <small>{detail}</small> : null}
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
  return <span className={`status-pill ${tone}`}>{children}</span>;
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
      <div className="markdown-preview invalid">
        <strong>Unable to render SKILL.md</strong>
        <p>{parsed.error}</p>
      </div>
    );
  }

  const properties = parsed.properties;

  return (
    <div className="markdown-preview">
      <div className="visual-metadata">
        <span>Name</span>
        <strong>{properties.name}</strong>
        <span>Description</span>
        <p>{properties.description}</p>
        {properties.compatibility ? (
          <>
            <span>Compatibility</span>
            <p>{properties.compatibility}</p>
          </>
        ) : null}
        {properties.allowedTools ? (
          <>
            <span>Allowed tools</span>
            <code>{properties.allowedTools}</code>
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
    <div className="markdown-body">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          const HeadingTag = `h${Math.min(block.level, 3)}` as "h1" | "h2" | "h3";
          return <HeadingTag key={`${block.kind}-${index}`}>{block.text}</HeadingTag>;
        }
        if (block.kind === "list") {
          return (
            <ul key={`${block.kind}-${index}`}>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }
        if (block.kind === "code") {
          return <pre key={`${block.kind}-${index}`}>{block.text}</pre>;
        }
        return <p key={`${block.kind}-${index}`}>{block.text}</p>;
      })}
    </div>
  );
}

function ValidationList({ errors, parseError }: { errors: string[]; parseError: string | null }) {
  const allErrors = [...(parseError ? [parseError] : []), ...errors];

  if (allErrors.length === 0) {
    return <p className="valid-message">No validation errors.</p>;
  }

  return (
    <ul className="validation-list">
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
