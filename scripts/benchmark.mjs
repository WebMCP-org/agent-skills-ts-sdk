import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import * as current from "../dist/index.js";

const content = `---
name: demo
description: Benchmark skill
metadata:
  version: 1.0
---
# Instructions
${"Read [the guide](references/guide.md).\n".repeat(100)}`;
const patch = {
  version: 1,
  operations: [{ type: "replace", before: "# Instructions", after: "# Updated" }],
};
/** @type {Array<[string, (sdk: typeof current) => unknown]>} */
const cases = [
  ["parse", (sdk) => sdk.parseSkillContent(content)],
  ["validate", (sdk) => sdk.validateSkillContent(content)],
  [
    "patch + name validation",
    (sdk) => sdk.applySkillPatch(content, patch, { validate: { expectedName: "demo" } }),
  ],
  ["resource extraction", (sdk) => sdk.extractResourceLinks(content)],
];
const baseline = process.argv[2]
  ? await import(pathToFileURL(resolve(process.argv[2])).href)
  : null;
const iterations = 2000;
function measure(run, sdk) {
  for (let i = 0; i < iterations; i++) run(sdk);
  const samples = [];
  for (let sample = 0; sample < 7; sample++) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) run(sdk);
    samples.push(((performance.now() - start) * 1000) / iterations);
  }
  return samples.sort((a, b) => a - b)[3];
}
for (const [name, run] of cases) {
  const before = baseline ? measure(run, baseline) : null;
  const after = measure(run, current);
  console.log(
    `${name}: ${after.toFixed(2)} µs/op${before === null ? "" : ` (baseline ${before.toFixed(2)}, ratio ${(after / before).toFixed(2)}x)`}`,
  );
}
console.log(
  `raw document: ${measure((sdk) => sdk.parseSkillDocument(content), current).toFixed(2)} µs/op`,
);
console.log(
  `extension validation: ${measure(
    (sdk) =>
      sdk.validateSkillContent(content, {
        validators: [
          (metadata) => (metadata.metadata?.version === "1.0" ? [] : ["invalid version"]),
        ],
      }),
    current,
  ).toFixed(2)} µs/op`,
);
