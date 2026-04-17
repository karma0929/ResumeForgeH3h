import type { JDAnalysis, ParsedResume, ResumeAnalysis } from "@/lib/types";
import { clamp } from "@/lib/utils";
import { analyzeJobDescription } from "@/lib/services/jd-analyzer";
import { parseResume } from "@/lib/services/resume-parser";

const ACTION_VERBS = [
  "built",
  "launched",
  "owned",
  "led",
  "designed",
  "improved",
  "automated",
  "created",
  "delivered",
  "developed",
  "implemented",
];

export function scoreResume(
  resumeInput: string | ParsedResume,
  jobDescriptionInput: string | JDAnalysis,
): ResumeAnalysis {
  const parsedResume =
    typeof resumeInput === "string" ? parseResume(resumeInput) : resumeInput;
  const jobDescription =
    typeof jobDescriptionInput === "string"
      ? analyzeJobDescription(jobDescriptionInput)
      : jobDescriptionInput;

  const resumeText = parsedResume.plainText.toLowerCase();
  const matchedKeywords = jobDescription.keywords.filter((keyword) =>
    resumeText.includes(keyword.toLowerCase()),
  );
  const missingKeywords = jobDescription.keywords.filter(
    (keyword) => !matchedKeywords.includes(keyword),
  );

  const bulletPool = parsedResume.experienceBullets;
  const actionVerbCount = bulletPool.filter((bullet) =>
    ACTION_VERBS.some((verb) => bullet.toLowerCase().startsWith(verb)),
  ).length;
  const quantifiedBulletCount = bulletPool.filter((bullet) =>
    /\b\d+([.,]\d+)?%?|\$\d|x\b/i.test(bullet),
  ).length;

  const keywordCoverage =
    jobDescription.keywords.length === 0
      ? 0
      : matchedKeywords.length / jobDescription.keywords.length;

  const atsReadiness = clamp(
    52 +
      parsedResume.sections.length * 6 +
      (parsedResume.contactLine ? 8 : 0) +
      matchedKeywords.length * 2,
  );

  const averageBulletLength =
    bulletPool.length === 0
      ? 0
      : bulletPool.reduce((sum, bullet) => sum + bullet.split(/\s+/).length, 0) /
        bulletPool.length;

  const clarity = clamp(
    58 +
      (averageBulletLength >= 10 && averageBulletLength <= 24 ? 16 : 4) +
      Math.min(parsedResume.skills.length, 10),
  );

  const impact = clamp(
    42 +
      actionVerbCount * 8 +
      quantifiedBulletCount * 10 +
      (parsedResume.experienceBullets.length >= 3 ? 6 : 0),
  );

  const jobFit = clamp(35 + keywordCoverage * 55 + matchedKeywords.length * 2);
  const overall = clamp((atsReadiness + clarity + impact + jobFit) / 4);

  const suggestions: string[] = [];
  const strengths: string[] = [];

  if (missingKeywords.length > 0) {
    suggestions.push(
      `Add or strengthen keywords like ${missingKeywords.slice(0, 4).join(", ")} to better mirror the job description.`,
    );
  }

  if (quantifiedBulletCount < 2) {
    suggestions.push("Add measurable outcomes to more bullets so recruiters can quickly see impact.");
  }

  if (!parsedResume.sections.find((section) => section.key === "summary")) {
    suggestions.push("Include a short summary that frames your fit for the target role in 2 to 3 lines.");
  }

  if (matchedKeywords.length >= Math.max(3, Math.floor(jobDescription.keywords.length / 2))) {
    strengths.push("Keyword coverage is already strong for an ATS-style screening pass.");
  }

  if (actionVerbCount >= 3) {
    strengths.push("Experience bullets open with action-oriented language that reads clearly.");
  }

  if (parsedResume.skills.length >= 8) {
    strengths.push("The skills section gives recruiters a fast scan of your toolset.");
  }

  return {
    overall,
    atsReadiness,
    clarity,
    impact,
    jobFit,
    matchedKeywords,
    missingKeywords,
    suggestions,
    strengths,
    categories: [
      {
        label: "ATS Readiness",
        score: atsReadiness,
        note: "Structure, scannability, and keyword presence.",
      },
      {
        label: "Clarity",
        score: clarity,
        note: "How cleanly the resume communicates scope and context.",
      },
      {
        label: "Impact",
        score: impact,
        note: "Evidence of outcomes, ownership, and quantified results.",
      },
      {
        label: "Job Fit",
        score: jobFit,
        note: "Alignment against the target job description.",
      },
    ],
  };
}
