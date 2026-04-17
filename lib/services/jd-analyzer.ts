import type { JDAnalysis } from "@/lib/types";

const KEYWORD_VOCABULARY = [
  "react",
  "next.js",
  "typescript",
  "javascript",
  "node.js",
  "python",
  "postgresql",
  "sql",
  "prisma",
  "api",
  "apis",
  "aws",
  "docker",
  "kubernetes",
  "testing",
  "analytics",
  "stakeholder management",
  "experimentation",
  "product thinking",
  "performance",
  "data modeling",
  "automation",
  "observability",
  "leadership",
  "communication",
  "cross-functional",
];

const STOPWORDS = new Set([
  "about",
  "after",
  "against",
  "build",
  "building",
  "candidate",
  "company",
  "experience",
  "including",
  "should",
  "their",
  "these",
  "those",
  "while",
  "with",
  "work",
  "working",
  "team",
  "teams",
  "role",
  "will",
  "have",
  "from",
  "using",
  "you",
  "your",
  "into",
  "that",
  "this",
  "across",
]);

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export function analyzeJobDescription(text: string): JDAnalysis {
  const normalized = text.replace(/\s+/g, " ").trim();
  const lower = normalized.toLowerCase();

  const matchedVocabulary = KEYWORD_VOCABULARY.filter((keyword) =>
    lower.includes(keyword.toLowerCase()),
  );

  const frequentTerms = normalized
    .toLowerCase()
    .match(/[a-z][a-z.+-]{2,}/g)
    ?.filter((term) => !STOPWORDS.has(term))
    .reduce<Record<string, number>>((accumulator, term) => {
      accumulator[term] = (accumulator[term] ?? 0) + 1;
      return accumulator;
    }, {});

  const rankedTerms = Object.entries(frequentTerms ?? {})
    .sort((left, right) => right[1] - left[1])
    .map(([term]) => term)
    .filter((term) => term.length > 3)
    .slice(0, 12);

  const keywords = unique([...matchedVocabulary, ...rankedTerms]).slice(0, 12);

  const mustHaves = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*•]/.test(line) || /requirements|qualifications/i.test(line))
    .map((line) => line.replace(/^[-*•]\s*/, ""))
    .slice(0, 6);

  const summary = normalized.split(/[.!?]/).slice(0, 2).join(". ").trim();
  const seniority = /intern/i.test(text)
    ? "Internship"
    : /senior|staff|lead/i.test(text)
      ? "Senior"
      : /new grad|entry|early career|junior/i.test(text)
        ? "Early Career"
        : "Mid-level";

  return {
    summary: summary || "Target product engineering role focused on impact, iteration, and execution.",
    seniority,
    keywords,
    mustHaves,
  };
}
