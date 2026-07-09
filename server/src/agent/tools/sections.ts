import { z } from "zod";
import { SECTION_COLORS } from "shared";
import { defineTool, ToolError } from "./types";
import { requireSection, specSummary } from "./helpers";

/** Tools that manage sections: the containers widgets live in. */

export const upsertSection = defineTool({
  name: "upsert_section",
  description:
    "Create a new dashboard section, or update the title/color/position of an existing one (matched by id). New sections are empty until a set_*_widget tool fills them.",
  schema: z.object({
    id: z.string().describe("Stable slug you choose, e.g. 'checking-overview'"),
    title: z.string(),
    color: z.enum(SECTION_COLORS),
    position: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Insert at this index (0 = top). Omit to append / keep position."),
  }),
  execute: (input, { spec }) => {
    const existing = spec.sections.find((s) => s.id === input.id);
    if (existing) {
      existing.title = input.title;
      existing.color = input.color;
      if (input.position !== undefined) {
        spec.sections.splice(spec.sections.indexOf(existing), 1);
        spec.sections.splice(input.position, 0, existing);
      }
      return `Updated section "${input.id}".\n${specSummary(spec)}`;
    }
    const section = { id: input.id, title: input.title, color: input.color, widget: null };
    spec.sections.splice(input.position ?? spec.sections.length, 0, section);
    return `Created empty section "${input.id}" — give it content with a set_*_widget tool.\n${specSummary(spec)}`;
  },
});

export const removeSection = defineTool({
  name: "remove_section",
  description: "Remove a section (and its widget) from the dashboard.",
  schema: z.object({ id: z.string() }),
  execute: (input, { spec }) => {
    requireSection(spec, input.id);
    spec.sections = spec.sections.filter((s) => s.id !== input.id);
    return `Removed section "${input.id}".\n${specSummary(spec)}`;
  },
});

export const reorderSections = defineTool({
  name: "reorder_sections",
  description:
    "Set the top-to-bottom order of all sections. Must list every existing section id exactly once.",
  schema: z.object({ orderedIds: z.array(z.string()) }),
  execute: (input, { spec }) => {
    const current = spec.sections.map((s) => s.id).sort();
    const proposed = [...input.orderedIds].sort();
    if (JSON.stringify(current) !== JSON.stringify(proposed)) {
      throw new ToolError(
        `orderedIds must contain every existing section id exactly once. Existing: ${current.join(", ")}.`,
      );
    }
    spec.sections = input.orderedIds.map(
      (id) => spec.sections.find((s) => s.id === id)!,
    );
    return `Reordered sections.\n${specSummary(spec)}`;
  },
});
