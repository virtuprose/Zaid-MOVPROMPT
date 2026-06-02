// Director skill loader.
//
// Each skill is a markdown file under ./skills/*.md with YAML-ish frontmatter:
//   ---
//   name: <slug>
//   target_model: <id>
//   description: <one-liner>
//   triggers:
//     - phrase one
//     - phrase two
//   ---
//   <full SKILL.md body>
//
// At request time we scan the last user message (+ a small recent window) for
// any trigger phrase. The first matched skill's full body is appended to the
// system prompt as an "═══ ACTIVE SKILL ═══" block. The model then has
// production-grade guidance for that specific brief, without bloating the
// prompt for every other request.
//
// Skills are server-side only — users never see SKILL.md, only better output.

import cinematicAdVeo3 from "./cinematic-ad-veo3.ts";
import productLaunchKling from "./product-launch-kling.ts";
import socialHook3s from "./social-hook-3s.ts";

interface Skill {
  name: string;
  triggers: string[];
  body: string; // full markdown including frontmatter
}

function parseSkill(raw: string): Skill {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return { name: "unknown", triggers: [], body: raw };
  const fm = fmMatch[1];
  const nameMatch = fm.match(/^name:\s*(.+)$/m);
  const triggers: string[] = [];
  const trigBlock = fm.match(/triggers:\s*\n([\s\S]+?)(?=\n[a-z_]+:|\n*$)/);
  if (trigBlock) {
    for (const line of trigBlock[1].split("\n")) {
      const t = line.match(/^\s*-\s*(.+?)\s*$/);
      if (t) triggers.push(t[1].toLowerCase());
    }
  }
  return {
    name: nameMatch?.[1]?.trim() ?? "unknown",
    triggers,
    body: raw,
  };
}

const SKILLS: Skill[] = [cinematicAdVeo3, productLaunchKling, socialHook3s].map(parseSkill);

/**
 * Pick the first skill whose trigger phrases appear in the recent conversation.
 * Returns null if nothing matches — the agent runs on the base system prompt.
 */
export function pickSkill(recentText: string): Skill | null {
  const hay = recentText.toLowerCase();
  for (const skill of SKILLS) {
    for (const trig of skill.triggers) {
      if (hay.includes(trig)) return skill;
    }
  }
  return null;
}

export function skillAddendum(skill: Skill): string {
  return (
    `\n\n═══ ACTIVE SKILL: ${skill.name} ═══\n` +
    `A trigger phrase in the brief matched this skill. Follow its guidance verbatim — its structure, block order, defaults, and failure-mode fixes override generic advice. The user does not see this skill; they only see the improved output.\n\n` +
    skill.body +
    `\n═══ END ACTIVE SKILL ═══\n`
  );
}
