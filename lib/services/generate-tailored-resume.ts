import type { ParsedResume, TailoredResumeOutput } from "@/lib/types";
import { analyzeJobDescription } from "@/lib/services/jd-analyzer";
import { rewriteBullet } from "@/lib/services/rewrite-bullet";
import { scoreResume } from "@/lib/services/score-resume";
import { parseResume } from "@/lib/services/resume-parser";

function buildSummary(parsedResume: ParsedResume, role: string, company: string, keywords: string[]) {
  const strength = parsedResume.skills.slice(0, 4).join(", ");
  const keywordLine = keywords.slice(0, 4).join(", ");

  return `Product-minded software engineer targeting ${role} opportunities at ${company}, with hands-on experience in ${strength || "modern web development"} and clear alignment to ${keywordLine || "cross-functional product execution"}.`;
}

export function generateTailoredResume(
  resumeText: string,
  jobDescriptionText: string,
  jobRole: string,
  company: string,
): TailoredResumeOutput {
  // TODO: move this to a model-driven generation pipeline when AI integrations are enabled.
  const parsedResume = parseResume(resumeText);
  const jd = analyzeJobDescription(jobDescriptionText);
  const analysis = scoreResume(parsedResume, jd);

  const bulletsToRewrite = parsedResume.experienceBullets.slice(0, 3);
  const rewrittenBullets = bulletsToRewrite.map((bullet) =>
    rewriteBullet(bullet, "tailored_to_jd", jobDescriptionText),
  );

  const summary = buildSummary(parsedResume, jobRole, company, jd.keywords);
  const skills = Array.from(new Set([...parsedResume.skills, ...jd.keywords])).slice(0, 12);

  const otherSections = parsedResume.sections
    .filter((section) => !["summary", "skills"].includes(section.key))
    .map((section) => {
      if (!["experience", "projects", "leadership"].includes(section.key)) {
        return `${section.title}\n${section.lines.join("\n")}`;
      }

      let rewriteIndex = 0;
      const nextLines = section.lines.map((line) => {
        if (!/^[-*•]/.test(line)) {
          return line;
        }

        const rewrite = rewrittenBullets[rewriteIndex];
        rewriteIndex += 1;

        if (!rewrite) {
          return line;
        }

        return `- ${rewrite.after}`;
      });

      return `${section.title}\n${nextLines.join("\n")}`;
    })
    .join("\n\n");

  const content = [
    "Professional Summary",
    summary,
    "",
    "Core Skills",
    skills.join(" | "),
    "",
    otherSections,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    name: `${company} ${jobRole} Tailored`,
    summary,
    highlights: [
      `Inserted target keywords such as ${jd.keywords.slice(0, 4).join(", ")}.`,
      "Reframed the top bullets to emphasize job-relevant outcomes and ownership.",
      "Raised the structure around ATS readiness by sharpening summary and skills sections.",
    ],
    rewrittenBullets,
    content,
    score: Math.min(99, analysis.overall + 6),
  };
}
