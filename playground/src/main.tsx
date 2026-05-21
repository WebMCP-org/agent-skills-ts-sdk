import {
  AlertCircle,
  Braces,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  Play,
  RefreshCcw,
  Save,
  WandSparkles,
} from "lucide-react";
import { StrictMode, useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createSkillPatch,
  estimateTokens,
  parseSkillContent,
  toPrompt,
  validateSkillContent,
  type SkillProperties,
} from "../../src/index.ts";
import "./styles.css";

type SkillFormData = {
  allowedTools: string;
  body: string;
  compatibility: string;
  description: string;
  license: string;
  name: string;
};

type ExampleSummary = {
  description: string;
  id: string;
  name: string;
  tokens: number;
};

type ValidationResponse = {
  bodyLength?: number;
  error?: string;
  ok: boolean;
  prompt?: string;
  properties?: SkillProperties;
  tokens?: number;
  validationErrors: string[];
};

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
  const [examples, setExamples] = useState<ExampleSummary[]>([]);
  const [serverResult, setServerResult] = useState<ValidationResponse | null>(null);
  const [isServerBusy, setIsServerBusy] = useState(false);
  const [copied, setCopied] = useState<"content" | "prompt" | "patch" | null>(null);

  const content = useMemo(() => assembleSkillContent(formData), [formData]);
  const parsed = useMemo(() => parseContent(content), [content]);
  const validationErrors = useMemo(() => validateSkillContent(content), [content]);
  const promptPreview = useMemo(() => {
    if (!parsed.ok) return "";
    return toPrompt([{ content, location: "playground/SKILL.md" }]);
  }, [content, parsed.ok]);
  const patch = useMemo(
    () => createSkillPatch(savedContent, content, { contextLines: 2 }),
    [content, savedContent],
  );
  const tokenEstimate = useMemo(() => estimateTokens(content), [content]);
  const hasChanges = content !== savedContent;

  useEffect(() => {
    void fetch("/api/examples")
      .then((response) => response.json() as Promise<{ skills: ExampleSummary[] }>)
      .then((data) => setExamples(data.skills))
      .catch(() => setExamples([]));
  }, []);

  const updateField = useCallback(
    (field: keyof SkillFormData) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData((current) => ({ ...current, [field]: event.target.value }));
      },
    [],
  );

  const loadExample = useCallback(async (id: string) => {
    const response = await fetch(`/api/examples/${encodeURIComponent(id)}`);
    const example = (await response.json()) as { content?: string };
    if (example.content) {
      const next = parseToFormData(example.content);
      setFormData(next);
      setSavedContent(example.content);
      setServerResult(null);
    }
  }, []);

  const validateOnWorker = useCallback(async () => {
    setIsServerBusy(true);
    try {
      const response = await fetch("/api/validate", {
        body: JSON.stringify({ content }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      setServerResult((await response.json()) as ValidationResponse);
    } finally {
      setIsServerBusy(false);
    }
  }, [content]);

  const saveSnapshot = useCallback(() => {
    setSavedContent(content);
  }, [content]);

  const copyText = useCallback(async (kind: "content" | "prompt" | "patch", value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1200);
  }, []);

  return (
    <main className="shell">
      <section className="workspace" aria-label="Skill editor workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">agent-skills-ts-sdk</p>
            <h1>SKILL.md editor</h1>
          </div>
          <div className="status-strip" aria-label="Current validation status">
            <StatusPill tone={validationErrors.length === 0 && parsed.ok ? "success" : "error"}>
              {validationErrors.length === 0 && parsed.ok ? "Valid" : "Needs work"}
            </StatusPill>
            <StatusPill tone="neutral">{tokenEstimate} tokens</StatusPill>
            <StatusPill tone={hasChanges ? "warn" : "neutral"}>
              {hasChanges ? "Unsaved draft" : "Snapshot saved"}
            </StatusPill>
          </div>
        </header>

        <section className="editor-grid">
          <section className="panel editor-panel" aria-label="Editor">
            <div className="panel-heading">
              <div>
                <h2>Skill metadata</h2>
                <p>Required fields plus optional compatibility and tool hints.</p>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setFormData(defaultSkill)}
                title="Reset"
              >
                <RefreshCcw size={16} />
              </button>
            </div>

            <div className="form-grid">
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

          <aside className="side-stack" aria-label="Examples and validation">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Worker examples</h2>
                  <p>Samples are served from the Cloudflare Worker.</p>
                </div>
                <WandSparkles size={18} />
              </div>
              <div className="example-list">
                {examples.map((example) => (
                  <button
                    className="example-row"
                    key={example.id}
                    type="button"
                    onClick={() => void loadExample(example.id)}
                  >
                    <span>
                      <strong>{example.name}</strong>
                      <small>{example.description}</small>
                    </span>
                    <code>{example.tokens}</code>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Validation</h2>
                  <p>Client and Worker both use the SDK.</p>
                </div>
                {validationErrors.length === 0 && parsed.ok ? (
                  <CheckCircle2 className="success-icon" size={18} />
                ) : (
                  <AlertCircle className="error-icon" size={18} />
                )}
              </div>
              <ValidationList
                parseError={parsed.ok ? null : parsed.error}
                errors={validationErrors}
              />
              <button
                className="primary-button"
                type="button"
                onClick={() => void validateOnWorker()}
              >
                {isServerBusy ? <Loader2 className="spin" size={16} /> : <Play size={16} />}
                Validate on Worker
              </button>
              {serverResult && (
                <div className="worker-result">
                  <strong>
                    {serverResult.ok ? "Worker parsed the skill" : "Worker rejected the skill"}
                  </strong>
                  <span>
                    {serverResult.validationErrors.length === 0
                      ? `${serverResult.tokens ?? 0} estimated tokens`
                      : `${serverResult.validationErrors.length} validation issue(s)`}
                  </span>
                </div>
              )}
            </section>
          </aside>
        </section>

        <section className="preview-grid">
          <PreviewPanel
            icon={<FileText size={16} />}
            title="SKILL.md"
            actionLabel={copied === "content" ? "Copied" : "Copy"}
            onAction={() => void copyText("content", content)}
          >
            {content}
          </PreviewPanel>
          <PreviewPanel
            icon={<Braces size={16} />}
            title="Prompt metadata"
            actionLabel={copied === "prompt" ? "Copied" : "Copy"}
            onAction={() => void copyText("prompt", promptPreview)}
          >
            {promptPreview || "Fix parse errors to preview prompt metadata."}
          </PreviewPanel>
          <PreviewPanel
            icon={<Save size={16} />}
            title="Patch from saved snapshot"
            actionLabel={hasChanges ? "Save snapshot" : "Saved"}
            onAction={saveSnapshot}
            secondaryActionLabel={copied === "patch" ? "Copied" : "Copy"}
            onSecondaryAction={() => void copyText("patch", JSON.stringify(patch, null, 2))}
          >
            {JSON.stringify(patch, null, 2)}
          </PreviewPanel>
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
  children: React.ReactNode;
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

function PreviewPanel({
  actionLabel,
  children,
  icon,
  onAction,
  onSecondaryAction,
  secondaryActionLabel,
  title,
}: {
  actionLabel: string;
  children: string;
  icon: React.ReactNode;
  onAction: () => void;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  title: string;
}) {
  return (
    <section className="panel preview-panel">
      <div className="panel-heading compact">
        <h2>
          {icon}
          {title}
        </h2>
        <div className="button-row">
          {onSecondaryAction && secondaryActionLabel ? (
            <button className="icon-label-button" type="button" onClick={onSecondaryAction}>
              <Copy size={15} />
              {secondaryActionLabel}
            </button>
          ) : null}
          <button className="icon-label-button" type="button" onClick={onAction}>
            <Copy size={15} />
            {actionLabel}
          </button>
        </div>
      </div>
      <pre>{children}</pre>
    </section>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "error" | "neutral" | "success" | "warn";
}) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
