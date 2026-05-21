import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function run(command, args, options = {}) {
  execFileSync(command, args, {
    stdio: "inherit",
    ...options,
  });
}

const packOutput = execFileSync("npm", ["pack", "--json", "--ignore-scripts"], {
  encoding: "utf8",
});
const [{ filename }] = JSON.parse(packOutput);
const tempDir = mkdtempSync(join(tmpdir(), "agent-skills-ts-sdk-consumer-"));
const tarballPath = join(tempDir, "package.tgz");

copyFileSync(filename, tarballPath);
unlinkSync(filename);

run("npm", ["init", "-y"], { cwd: tempDir });
run("npm", ["install", "--ignore-scripts", "./package.tgz"], { cwd: tempDir });
run(
  "node",
  [
    "--input-type=module",
    "-e",
    [
      "import('agent-skills-ts-sdk').then((m) => {",
      "  if (typeof m.parseSkillContent !== 'function') throw new Error('Missing parseSkillContent export');",
      "  if (typeof m.validateSkillContent !== 'function') throw new Error('Missing validateSkillContent export');",
      "  if (typeof m.toPrompt !== 'function') throw new Error('Missing toPrompt export');",
      "  if (typeof m.createSkillPatch !== 'function') throw new Error('Missing createSkillPatch export');",
      "})",
    ].join(" "),
  ],
  { cwd: tempDir },
);

writeFileSync(
  join(tempDir, "index.ts"),
  [
    "import {",
    "  parseSkillContent,",
    "  validateSkillContent,",
    "  type SkillProperties,",
    "  type SkillPatch,",
    '} from "agent-skills-ts-sdk";',
    "",
    "const content = `---",
    "name: demo-skill",
    "description: Demo skill",
    "---",
    "Body`;",
    "const parsed = parseSkillContent(content);",
    "const errors = validateSkillContent(content);",
    "const properties: SkillProperties = parsed.properties;",
    "const patch = {} as SkillPatch;",
    "console.log(Boolean(properties.name) && Array.isArray(errors) && Boolean(patch));",
    "",
  ].join("\n"),
);
run("npm", ["install", "--ignore-scripts", "--save-dev", "typescript@5"], { cwd: tempDir });
run(
  "npx",
  [
    "tsc",
    "--module",
    "nodenext",
    "--moduleResolution",
    "nodenext",
    "--target",
    "es2022",
    "--strict",
    "--noEmit",
    "index.ts",
  ],
  { cwd: tempDir },
);

console.log(`Packed consumer verified in ${tempDir}.`);
