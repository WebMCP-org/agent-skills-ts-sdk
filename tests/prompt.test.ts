import { describe, expect, it } from "vite-plus/test";
import { toDisclosureInstructions, toDisclosurePrompt, toPrompt } from "../src/prompt";

describe("toPrompt", () => {
  it("omits location when none is supplied", () => {
    expect(toPrompt([{ name: "my-skill", description: "A test skill" }])).toBe(`<available_skills>
<skill>
<name>
my-skill
</name>
<description>
A test skill
</description>
</skill>
</available_skills>`);
  });

  it("escapes XML-sensitive locations", () => {
    const result = toPrompt([
      {
        name: "special-skill",
        description: "Skill with XML-sensitive location",
        location: "/path?x=1&y=<tag>",
      },
    ]);

    expect(result).toContain("/path?x=1&amp;y=&lt;tag&gt;");
    expect(result).not.toContain("/path?x=1&y=<tag>");
  });
});

describe("toDisclosurePrompt", () => {
  it("includes only non-empty resource hints", () => {
    expect(
      toDisclosurePrompt([
        {
          name: "pizza-maker",
          description: "Interactive pizza builder",
          resources: ["build-pizza"],
        },
        { name: "empty-skill", description: "No resources", resources: [] },
      ]),
    ).toBe(`<available_skills>
<skill>
<name>
pizza-maker
</name>
<description>
Interactive pizza builder
</description>
<resources>
build-pizza
</resources>
</skill>
<skill>
<name>
empty-skill
</name>
<description>
No resources
</description>
</skill>
</available_skills>`);
  });
});

describe("toDisclosureInstructions", () => {
  it("uses the default read tool name", () => {
    expect(toDisclosureInstructions()).toBe(`Skills provide context for using tools effectively.
Call read_skill with a skill name to read its overview and discover available resources.
Then call read_skill with both a skill name and resource name to read detailed instructions.`);
  });
});
