import type {
  JDAnalysis,
  ParsedResume,
  ResumeAnalysis,
  RewriteMode,
  RewriteResult,
  TailoredResumeOutput,
} from "@/lib/types";

export type AIProviderName = "mock" | "openai";
export type AIProviderMode = "auto" | AIProviderName;

export interface AnalyzeJobDescriptionInput {
  jobDescriptionText: string;
}

export interface ScoreResumeInput {
  resumeText: string;
  parsedResume?: ParsedResume;
  jobDescriptionText: string;
}

export interface RewriteBulletInput {
  bullet: string;
  mode: RewriteMode;
  jobDescriptionText?: string;
  resumeText?: string;
}

export interface GenerateTailoredResumeInput {
  resumeText: string;
  jobDescriptionText: string;
  jobRole: string;
  company: string;
}

export interface AIProvider {
  readonly name: AIProviderName;
  analyzeJobDescription(input: AnalyzeJobDescriptionInput): Promise<JDAnalysis>;
  scoreResume(input: ScoreResumeInput): Promise<ResumeAnalysis>;
  rewriteBullet(input: RewriteBulletInput): Promise<RewriteResult>;
  generateTailoredResume(input: GenerateTailoredResumeInput): Promise<TailoredResumeOutput>;
}
