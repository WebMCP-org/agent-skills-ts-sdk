import { ChevronDown, Code2, Copy, Eye, Github, Loader2, Play } from "lucide-react";
import { Markdown } from "@copilotkit/react-ui";
// @ts-ignore Vite handles CSS side-effect imports in the playground build.
import "@copilotkit/react-ui/styles.css";
import {
  StrictMode,
  useCallback,
  useMemo,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type ReactNode,
} from "react";
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
  role: "assistant" | "user";
};

type ViewMode = "editor" | "raw" | "rich";

const MAX_SKILL_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_COMPATIBILITY_LENGTH = 500;

declare global {
  interface Window {
    __agentSkillsPlaygroundRoot?: Root;
  }
}

const skillDbName = "agent-skills-ts-sdk-playground";
const skillDbVersion = 1;
const skillsStoreName = "skills";

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
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("editor");
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

  const resetSkill = useCallback(() => {
    setFormData(defaultSkill);
    setSavedContent(assembleSkillContent(defaultSkill));
    setStorageMessage(null);
    setMockMessages(createInitialMockMessages(defaultSkill));
  }, []);

  const validateInBrowser = useCallback(() => {
    const result = {
      bodyLength: parsed.ok ? parsed.body.length : undefined,
      error: parsed.ok ? undefined : parsed.error,
      ok: parsed.ok && validationErrors.length === 0,
      properties: parsed.ok ? parsed.properties : undefined,
      tokens: tokenEstimate,
      validationErrors,
    };
    return result;
  }, [parsed, tokenEstimate, validationErrors]);

  const saveSnapshot = useCallback(async () => {
    const record = createSavedSkillRecord(content, formData);
    await putSavedSkill(record);
    setSavedContent(content);
    setStorageMessage("Saved");
  }, [content, formData]);

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
    <main className="flex h-dvh min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="shrink-0 border-b">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-muted-foreground">
              agent-skills-ts-sdk
            </p>
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">Skill Editor</h1>
          </div>
          <div className="hidden min-w-0 items-center gap-2 lg:flex" aria-label="Current status">
            <StatusPill tone={isValid ? "success" : "error"}>
              {isValid ? "Valid" : "Needs Work"}
            </StatusPill>
            <StatusPill tone="neutral">{tokenEstimate} tokens</StatusPill>
            <StatusPill tone={hasChanges ? "warn" : "neutral"}>
              {hasChanges ? "Unsaved" : "Saved"}
            </StatusPill>
            {storageMessage ? <StatusPill tone="neutral">{storageMessage}</StatusPill> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              className={buttonClass({ variant: "outline" })}
              href="https://github.com/WebMCP-org/agent-skills-ts-sdk"
              rel="noreferrer"
              target="_blank"
            >
              <Github size={16} />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <a
              className={buttonClass({ variant: "outline" })}
              href="https://github.com/WebMCP-org/agent-skills-ts-sdk/blob/main/README.md"
              rel="noreferrer"
              target="_blank"
            >
              README
            </a>
            <button
              className={buttonClass({ variant: "outline" })}
              type="button"
              onClick={() => void copySkill()}
            >
              <Copy size={15} />
              <span className="hidden sm:inline">{copied === "content" ? "Copied" : "Copy"}</span>
            </button>
            <button className={buttonClass()} type="button" onClick={runMockAgent}>
              <Play size={16} />
              Run
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t px-4 py-2 sm:px-6">
          <div className="inline-flex rounded-md border bg-muted p-1" aria-label="Skill view">
            <button
              className={previewButtonClass(viewMode === "editor")}
              type="button"
              onClick={() => setViewMode("editor")}
            >
              Editor
            </button>
            <button
              className={previewButtonClass(viewMode === "raw")}
              type="button"
              onClick={() => setViewMode("raw")}
            >
              <Code2 size={15} />
              Raw
            </button>
            <button
              className={previewButtonClass(viewMode === "rich")}
              type="button"
              onClick={() => setViewMode("rich")}
            >
              <Eye size={15} />
              Rich
            </button>
          </div>
          <code className="hidden min-w-0 truncate rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground md:block">
            parseSkillContent · validateSkillContent · toPrompt · estimateTokens
          </code>
        </div>
      </header>

      <section
        className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(420px,32rem)]"
        aria-label="Skill editor and agent mock"
      >
        <section className="flex min-h-0 min-w-0 flex-col" aria-label="Skill workspace">
          <div className="min-h-0 flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
            {viewMode === "editor" ? (
              <div className="mx-auto max-w-3xl">
                <SkillForm
                  value={formData}
                  onCancel={resetSkill}
                  onChange={(next) => {
                    setFormData(next);
                    setStorageMessage(null);
                  }}
                  onSubmit={() => void saveSnapshot()}
                />
              </div>
            ) : viewMode === "raw" ? (
              <div className="mx-auto max-w-4xl space-y-4">
                <pre className="min-h-[70vh] overflow-auto rounded-md bg-muted/50 p-4 text-xs leading-5 text-foreground">
                  {content}
                </pre>
              </div>
            ) : (
              <div className="mx-auto max-w-4xl">
                <SkillVisual parsed={parsed} validationErrors={validationErrors} />
              </div>
            )}
          </div>
        </section>

        <section
          className="flex min-h-0 min-w-0 flex-col border-t bg-background lg:border-l lg:border-t-0"
          aria-label="CopilotKit mock agent"
        >
          <div
            className="grid min-h-0 min-w-0 flex-1 content-end gap-5 overflow-auto px-4 py-5 sm:px-5"
            aria-label="Mock CopilotKit chat transcript"
          >
            {mockMessages.map((message) => (
              <div className={mockMessageClass(message.role)} key={message.id}>
                <div className="flex w-full min-w-0 max-w-full flex-col gap-2 overflow-hidden break-words text-sm leading-6 [overflow-wrap:anywhere] group-[.is-user]:ml-auto group-[.is-user]:w-fit group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground [&_*]:min-w-0 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:rounded-md [&_pre]:bg-muted/70 [&_pre]:p-3 [&_pre_code]:!whitespace-pre-wrap [&_pre_div]:!max-w-full [&_pre_div]:!whitespace-pre-wrap [&_pre_div]:!break-words [&_ul]:ml-5 [&_ul]:list-disc">
                  <Markdown content={message.content} />
                </div>
              </div>
            ))}
          </div>
          <div className="shrink-0 border-t p-4 sm:p-5">
            <div className="min-h-11 rounded-lg border bg-muted/30" aria-label="LLM mock input" />
          </div>
        </section>
      </section>
    </main>
  );
}

function cn(...classes: Array<false | null | string | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function buttonClass({
  className,
  size = "default",
  variant = "default",
}: {
  className?: string;
  size?: "default" | "icon" | "sm";
  variant?: "default" | "ghost" | "outline";
} = {}): string {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive";
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
  };
  const sizes = {
    default: "h-9 px-4 py-2 has-[>svg]:px-3",
    icon: "size-9",
    sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
  };

  return cn(base, variants[variant], sizes[size], className);
}

function Button({
  className,
  size = "default",
  variant = "default",
  ...props
}: ComponentProps<"button"> & {
  size?: "default" | "icon" | "sm";
  variant?: "default" | "ghost" | "outline";
}) {
  return (
    <button
      className={buttonClass({ className, size, variant })}
      data-size={size}
      data-variant={variant}
      {...props}
    />
  );
}

function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        className,
      )}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      data-slot="textarea"
      {...props}
    />
  );
}

function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      data-slot="label"
      {...props}
    />
  );
}

function CharacterCounter({ current, max }: { current: number; max: number }) {
  const percentage = (current / max) * 100;
  const isWarning = percentage >= 80 && percentage < 100;
  const isOver = percentage >= 100;

  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        isOver && "text-destructive",
        isWarning && "text-warning",
        !isOver && !isWarning && "text-muted-foreground",
      )}
    >
      {current}/{max}
    </span>
  );
}

function SkillForm({
  isLoading = false,
  onCancel,
  onChange,
  onSubmit,
  submitLabel = "Save",
  value,
}: {
  isLoading?: boolean;
  onCancel?: () => void;
  onChange: (value: SkillFormData) => void;
  onSubmit: () => void | Promise<void>;
  submitLabel?: string;
  value: SkillFormData;
}) {
  const [optionalOpen, setOptionalOpen] = useState(false);

  const updateField =
    (field: keyof SkillFormData) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ ...value, [field]: event.target.value });
    };

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="skill-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <CharacterCounter current={value.name.length} max={MAX_SKILL_NAME_LENGTH} />
          </div>
          <Input
            aria-invalid={value.name.length > MAX_SKILL_NAME_LENGTH}
            autoComplete="off"
            data-mono="true"
            disabled={isLoading}
            id="skill-name"
            placeholder="my-skill-name"
            spellCheck={false}
            value={value.name}
            onChange={updateField("name")}
          />
          <p className="text-xs text-muted-foreground">
            Lowercase letters, numbers, and hyphens only
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="skill-description">
              Description <span className="text-destructive">*</span>
            </Label>
            <CharacterCounter current={value.description.length} max={MAX_DESCRIPTION_LENGTH} />
          </div>
          <Textarea
            aria-invalid={value.description.length > MAX_DESCRIPTION_LENGTH}
            className="min-h-[80px] resize-none"
            disabled={isLoading}
            id="skill-description"
            placeholder="Describe what this skill does and when the agent should use it..."
            value={value.description}
            onChange={updateField("description")}
          />
          <p className="text-xs text-muted-foreground">
            Explain what the skill does and when to use it
          </p>
        </div>
      </div>

      <div>
        <Button
          className="flex w-full items-center justify-between px-0 hover:bg-transparent"
          type="button"
          variant="ghost"
          onClick={() => setOptionalOpen((open) => !open)}
        >
          <span className="text-sm font-medium text-muted-foreground">Optional Fields</span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              optionalOpen && "rotate-180",
            )}
          />
        </Button>
        {optionalOpen ? (
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="skill-compatibility">Compatibility</Label>
                <CharacterCounter
                  current={value.compatibility.length}
                  max={MAX_COMPATIBILITY_LENGTH}
                />
              </div>
              <Input
                aria-invalid={value.compatibility.length > MAX_COMPATIBILITY_LENGTH}
                autoComplete="off"
                disabled={isLoading}
                id="skill-compatibility"
                placeholder="Requires Node.js 18+, access to filesystem"
                value={value.compatibility}
                onChange={updateField("compatibility")}
              />
              <p className="text-xs text-muted-foreground">Environment requirements (optional)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skill-license">License</Label>
              <Input
                autoComplete="off"
                disabled={isLoading}
                id="skill-license"
                placeholder="MIT"
                value={value.license}
                onChange={updateField("license")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skill-allowed-tools">Allowed Tools</Label>
              <Input
                autoComplete="off"
                data-mono="true"
                disabled={isLoading}
                id="skill-allowed-tools"
                placeholder="Bash(git:*) Read Write"
                spellCheck={false}
                value={value.allowedTools}
                onChange={updateField("allowedTools")}
              />
              <p className="text-xs text-muted-foreground">
                Space-separated list of pre-approved tools (advanced)
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="skill-body">Instructions (Markdown)</Label>
        <Textarea
          className="min-h-[42vh] resize-y font-mono text-sm leading-6"
          data-mono="true"
          disabled={isLoading}
          id="skill-body"
          placeholder={`# How to Use This Skill

1. First, do this...
2. Then do that...

## Examples

\`\`\`
Example code here
\`\`\``}
          spellCheck={false}
          value={value.body}
          onChange={updateField("body")}
        />
        <p className="text-xs text-muted-foreground">
          Markdown content that teaches the agent how to help
        </p>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button disabled={isLoading} type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button disabled={isLoading} type="submit">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
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
  const base = "group flex w-full min-w-0 max-w-full flex-col gap-2";
  if (role === "user") return `${base} is-user ml-auto justify-end`;
  return `${base} is-assistant`;
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
      content: `Use \`${skill.name}\`.`,
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
  const toolSummary =
    parsed.ok && validationErrors.length === 0
      ? `read_skill(${skill.name})`
      : [
          `read_skill(${skill.name}) failed.`,
          parseError ? `Parser error: ${parseError}` : null,
          validationErrors.length > 0 ? `Validation errors: ${validationErrors.join("; ")}` : null,
        ]
          .filter(Boolean)
          .join("\n");

  return [
    {
      content: `Use \`${skill.name}\` for README work.`,
      id: "user-run",
      role: "user",
    },
    {
      content: [
        toolSummary,
        "",
        "```xml",
        promptPreview || "<available_skills />",
        "```",
        "",
        `Activated **${skill.name}**.`,
        `Description: ${skill.description}`,
        `Allowed tools: ${skill.allowedTools || "none"}`,
      ].join("\n"),
      id: "assistant-run",
      role: "assistant",
    },
  ];
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
