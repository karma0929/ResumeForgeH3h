import type { RewriteMode, RewriteResult } from "@/lib/types";
import { analyzeJobDescription } from "@/lib/services/jd-analyzer";

function normalizeBullet(bullet: string) {
  return bullet.replace(/^[-*•]\s*/, "").replace(/\s+/g, " ").trim();
}

function finishSentence(value: string) {
  return value.endsWith(".") ? value : `${value}.`;
}

function shorterVersion(bullet: string) {
  return bullet
    .replace(/\bresponsible for\b/gi, "owned")
    .replace(/\bin order to\b/gi, "to")
    .replace(/\bworked on\b/gi, "built")
    .replace(/\bhelped\b/gi, "supported")
    .replace(/\bvery\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function technicalVersion(bullet: string, keywords: string[]) {
  const lead = bullet.replace(/^(Built|Created|Made)/i, "Engineered");
  const context = keywords.slice(0, 2).join(" and ");

  if (context) {
    return `${lead} with production-ready ${context} workflows and clearer system design context`;
  }

  return `${lead} with typed data models, API integrations, and a stronger implementation signal`;
}

function leadershipVersion(bullet: string) {
  const promoted = bullet.replace(/^(Built|Created|Developed|Implemented)/i, "Led");
  return `${promoted} while coordinating scope, execution, and stakeholder feedback across the project lifecycle`;
}

function tailoredVersion(bullet: string, keywords: string[]) {
  const selected = keywords.slice(0, 3);

  if (selected.length === 0) {
    return `${bullet} with language that better matches the target role`;
  }

  return `${bullet} with emphasis on ${selected.join(", ")}`;
}

export function rewriteBullet(
  bullet: string,
  mode: RewriteMode,
  jobDescriptionText?: string,
): RewriteResult {
  // TODO: replace deterministic phrasing rules with LLM-backed rewriting once external AI is connected.
  const before = normalizeBullet(bullet);
  const keywords = jobDescriptionText ? analyzeJobDescription(jobDescriptionText).keywords : [];

  let after = before;
  let whyBetter: string[] = [];

  switch (mode) {
    case "shorter":
      after = shorterVersion(before);
      whyBetter = [
        "Cuts filler so the recruiter gets to the action faster.",
        "Keeps the bullet tighter for ATS and skim reading.",
      ];
      break;
    case "more_technical":
      after = technicalVersion(before, keywords);
      whyBetter = [
        "Adds implementation language that sounds closer to a technical hiring bar.",
        "Makes the scope feel more concrete without changing the underlying story.",
      ];
      break;
    case "leadership_focused":
      after = leadershipVersion(before);
      whyBetter = [
        "Surfaces ownership instead of only task execution.",
        "Signals collaboration and decision-making, which helps for fast-growth teams.",
      ];
      break;
    case "tailored_to_jd":
      after = tailoredVersion(before, keywords);
      whyBetter = [
        "Mirrors role-specific keywords that ATS screens and recruiters scan for.",
        "Connects your experience to the exact priorities in the job description.",
      ];
      break;
  }

  return {
    mode,
    before: finishSentence(before),
    after: finishSentence(after),
    whyBetter,
    insertedKeywords: keywords.slice(0, 3),
  };
}
