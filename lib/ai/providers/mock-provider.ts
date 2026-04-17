import type { AIProvider } from "@/lib/ai/types";
import { analyzeJobDescription } from "@/lib/services/jd-analyzer";
import { generateTailoredResume } from "@/lib/services/generate-tailored-resume";
import { rewriteBullet } from "@/lib/services/rewrite-bullet";
import { scoreResume } from "@/lib/services/score-resume";

export class MockAIProvider implements AIProvider {
  readonly name = "mock" as const;

  async analyzeJobDescription(input: { jobDescriptionText: string }) {
    return analyzeJobDescription(input.jobDescriptionText);
  }

  async scoreResume(input: {
    resumeText: string;
    jobDescriptionText: string;
  }) {
    return scoreResume(input.resumeText, input.jobDescriptionText);
  }

  async rewriteBullet(input: {
    bullet: string;
    mode: Parameters<typeof rewriteBullet>[1];
    jobDescriptionText?: string;
  }) {
    return rewriteBullet(input.bullet, input.mode, input.jobDescriptionText);
  }

  async generateTailoredResume(input: {
    resumeText: string;
    jobDescriptionText: string;
    jobRole: string;
    company: string;
  }) {
    return generateTailoredResume(
      input.resumeText,
      input.jobDescriptionText,
      input.jobRole,
      input.company,
    );
  }
}
