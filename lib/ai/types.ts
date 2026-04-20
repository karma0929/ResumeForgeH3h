import type {
  JDAnalysis,
  TargetRoleBriefData,
  ResumeDraftOutput,
  ResumeOutputLanguage,
  ResumeProfileData,
  ResumeTemplateId,
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

export interface GenerateResumeDraftInput {
  profileData: ResumeProfileData;
  outputLanguage: ResumeOutputLanguage;
  templateId: ResumeTemplateId;
  resumeStyle?: string;
  keywordEmphasis?: string;
  industryPreference?: string;
  role?: string;
  company?: string;
  jobDescriptionText?: string;
}

export interface ExtractJobPostingInput {
  sourceUrl: string;
  jobPostingText: string;
}

export interface ExtractedJobPostingOutput {
  sourceUrl: string;
  company: string;
  role: string;
  location: string;
  cleanedJobDescription: string;
  briefData: TargetRoleBriefData;
}

export interface AIProvider {
  readonly name: AIProviderName;
  analyzeJobDescription(input: AnalyzeJobDescriptionInput): Promise<JDAnalysis>;
  scoreResume(input: ScoreResumeInput): Promise<ResumeAnalysis>;
  rewriteBullet(input: RewriteBulletInput): Promise<RewriteResult>;
  generateTailoredResume(input: GenerateTailoredResumeInput): Promise<TailoredResumeOutput>;
  generateResumeDraft(input: GenerateResumeDraftInput): Promise<ResumeDraftOutput>;
  extractJobPosting(input: ExtractJobPostingInput): Promise<ExtractedJobPostingOutput>;
}
