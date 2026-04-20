import OpenAI from "openai";
import type {
  AnalyzeJobDescriptionInput,
  AIProvider,
  ExtractJobPostingInput,
  ExtractedJobPostingOutput,
  GenerateResumeDraftInput,
  GenerateTailoredResumeInput,
  RewriteBulletInput,
  ScoreResumeInput,
} from "@/lib/ai/types";
import type {
  JDAnalysis,
  ResumeDraftOutput,
  ResumeAnalysis,
  TargetRoleBriefData,
  RewriteResult,
  TailoredResumeOutput,
} from "@/lib/types";
import { getAIModel, requireOpenAIKey } from "@/lib/env";
import { ExternalServiceError } from "@/lib/errors";
import { parseResume } from "@/lib/services/resume-parser";

type JSONSchema = Record<string, unknown>;

const jdAnalysisSchema: JSONSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "seniority", "keywords", "mustHaves"],
  properties: {
    summary: { type: "string" },
    seniority: { type: "string" },
    keywords: {
      type: "array",
      items: { type: "string" },
    },
    mustHaves: {
      type: "array",
      items: { type: "string" },
    },
  },
};

const resumeAnalysisSchema: JSONSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "overall",
    "atsReadiness",
    "clarity",
    "impact",
    "jobFit",
    "matchedKeywords",
    "missingKeywords",
    "suggestions",
    "strengths",
    "categories",
  ],
  properties: {
    overall: { type: "integer" },
    atsReadiness: { type: "integer" },
    clarity: { type: "integer" },
    impact: { type: "integer" },
    jobFit: { type: "integer" },
    matchedKeywords: { type: "array", items: { type: "string" } },
    missingKeywords: { type: "array", items: { type: "string" } },
    suggestions: { type: "array", items: { type: "string" } },
    strengths: { type: "array", items: { type: "string" } },
    categories: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "score", "note"],
        properties: {
          label: { type: "string" },
          score: { type: "integer" },
          note: { type: "string" },
        },
      },
    },
  },
};

const rewriteResultSchema: JSONSchema = {
  type: "object",
  additionalProperties: false,
  required: ["mode", "before", "after", "whyBetter", "insertedKeywords"],
  properties: {
    mode: {
      type: "string",
      enum: ["shorter", "more_technical", "leadership_focused", "tailored_to_jd"],
    },
    before: { type: "string" },
    after: { type: "string" },
    whyBetter: { type: "array", items: { type: "string" } },
    insertedKeywords: { type: "array", items: { type: "string" } },
  },
};

const tailoredResumeSchema: JSONSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "summary", "highlights", "rewrittenBullets", "content", "score"],
  properties: {
    name: { type: "string" },
    summary: { type: "string" },
    highlights: { type: "array", items: { type: "string" } },
    rewrittenBullets: {
      type: "array",
      items: rewriteResultSchema,
    },
    content: { type: "string" },
    score: { type: "integer" },
  },
};

const resumeDraftSchema: JSONSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "summary", "sections", "content", "qualityNotes"],
  properties: {
    name: { type: "string" },
    summary: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "title", "lines", "bullets"],
        properties: {
          key: { type: "string" },
          title: { type: "string" },
          lines: { type: "array", items: { type: "string" } },
          bullets: { type: "array", items: { type: "string" } },
        },
      },
    },
    content: { type: "string" },
    qualityNotes: { type: "array", items: { type: "string" } },
  },
};

const jobPostingExtractSchema: JSONSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "sourceUrl",
    "company",
    "role",
    "location",
    "cleanedJobDescription",
    "briefData",
  ],
  properties: {
    sourceUrl: { type: "string" },
    company: { type: "string" },
    role: { type: "string" },
    location: { type: "string" },
    cleanedJobDescription: { type: "string" },
    briefData: {
      type: "object",
      additionalProperties: false,
      required: [
        "sourceUrl",
        "seniorityLevel",
        "employmentType",
        "workMode",
        "industryDomain",
        "salaryRange",
        "topRequiredSkills",
        "preferredSkills",
        "emphasizeKeywords",
        "responsibilitiesSummary",
        "hiringPriorities",
        "atsIntensity",
        "technicalIntensity",
        "recruiterNotes",
      ],
      properties: {
        sourceUrl: { type: "string" },
        seniorityLevel: { type: "string" },
        employmentType: { type: "string" },
        workMode: { type: "string" },
        industryDomain: { type: "string" },
        salaryRange: { type: "string" },
        topRequiredSkills: { type: "array", items: { type: "string" } },
        preferredSkills: { type: "array", items: { type: "string" } },
        emphasizeKeywords: { type: "array", items: { type: "string" } },
        responsibilitiesSummary: { type: "string" },
        hiringPriorities: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "technical_depth",
              "communication",
              "leadership",
              "execution",
              "research",
              "product_thinking",
            ],
          },
        },
        atsIntensity: { type: "string" },
        technicalIntensity: { type: "string" },
        recruiterNotes: { type: "string" },
      },
    },
  },
};

function asStringArray(value: unknown, limit = 12) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function clampScore(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : 0;
}

function normalizeJDAnalysis(value: unknown): JDAnalysis {
  const raw = (value ?? {}) as Record<string, unknown>;

  return {
    summary:
      typeof raw.summary === "string" && raw.summary.trim().length > 0
        ? raw.summary.trim()
        : "Target role summary unavailable.",
    seniority:
      typeof raw.seniority === "string" && raw.seniority.trim().length > 0
        ? raw.seniority.trim()
        : "Unknown",
    keywords: asStringArray(raw.keywords),
    mustHaves: asStringArray(raw.mustHaves, 8),
  };
}

function normalizeResumeAnalysis(value: unknown): ResumeAnalysis {
  const raw = (value ?? {}) as Record<string, unknown>;
  const categoriesInput = Array.isArray(raw.categories) ? raw.categories : [];

  return {
    overall: clampScore(raw.overall),
    atsReadiness: clampScore(raw.atsReadiness),
    clarity: clampScore(raw.clarity),
    impact: clampScore(raw.impact),
    jobFit: clampScore(raw.jobFit),
    matchedKeywords: asStringArray(raw.matchedKeywords),
    missingKeywords: asStringArray(raw.missingKeywords),
    suggestions: asStringArray(raw.suggestions, 8),
    strengths: asStringArray(raw.strengths, 8),
    categories: categoriesInput
      .map((item) => {
        const category = item as Record<string, unknown>;
        return {
          label:
            typeof category.label === "string" && category.label.trim().length > 0
              ? category.label.trim()
              : "Unknown",
          score: clampScore(category.score),
          note:
            typeof category.note === "string" && category.note.trim().length > 0
              ? category.note.trim()
              : "",
        };
      })
      .slice(0, 4),
  };
}

function normalizeRewriteResult(value: unknown): RewriteResult {
  const raw = (value ?? {}) as Record<string, unknown>;
  const mode =
    raw.mode === "shorter" ||
    raw.mode === "more_technical" ||
    raw.mode === "leadership_focused" ||
    raw.mode === "tailored_to_jd"
      ? raw.mode
      : "tailored_to_jd";

  return {
    mode,
    before: typeof raw.before === "string" ? raw.before.trim() : "",
    after: typeof raw.after === "string" ? raw.after.trim() : "",
    whyBetter: asStringArray(raw.whyBetter, 6),
    insertedKeywords: asStringArray(raw.insertedKeywords, 6),
  };
}

function normalizeTailoredResume(value: unknown): TailoredResumeOutput {
  const raw = (value ?? {}) as Record<string, unknown>;

  return {
    name: typeof raw.name === "string" ? raw.name.trim() : "Tailored Resume",
    summary: typeof raw.summary === "string" ? raw.summary.trim() : "",
    highlights: asStringArray(raw.highlights, 6),
    rewrittenBullets: Array.isArray(raw.rewrittenBullets)
      ? raw.rewrittenBullets.map((item) => normalizeRewriteResult(item)).slice(0, 6)
      : [],
    content: typeof raw.content === "string" ? raw.content : "",
    score: clampScore(raw.score),
  };
}

function normalizeResumeDraft(value: unknown, language: "en" | "zh"): ResumeDraftOutput {
  const raw = (value ?? {}) as Record<string, unknown>;
  const sectionsInput = Array.isArray(raw.sections) ? raw.sections : [];

  return {
    name:
      typeof raw.name === "string" && raw.name.trim().length > 0
        ? raw.name.trim()
        : language === "zh"
          ? "简历草稿"
          : "Resume Draft",
    summary:
      typeof raw.summary === "string" && raw.summary.trim().length > 0
        ? raw.summary.trim()
        : language === "zh"
          ? "已基于输入信息生成草稿。"
          : "Draft generated from supplied profile information.",
    sections: sectionsInput
      .map((item) => {
        const section = item as Record<string, unknown>;
        return {
          key:
            typeof section.key === "string" && section.key.trim().length > 0
              ? section.key.trim()
              : "custom",
          title:
            typeof section.title === "string" && section.title.trim().length > 0
              ? section.title.trim()
              : language === "zh"
                ? "补充信息"
                : "Additional Information",
          lines: asStringArray(section.lines, 20),
          bullets: asStringArray(section.bullets, 30),
        };
      })
      .filter((section) => section.lines.length > 0 || section.bullets.length > 0),
    content: typeof raw.content === "string" ? raw.content.trim() : "",
    qualityNotes: asStringArray(raw.qualityNotes, 8),
  };
}

const allowedPriorities: Array<TargetRoleBriefData["hiringPriorities"][number]> = [
  "technical_depth",
  "communication",
  "leadership",
  "execution",
  "research",
  "product_thinking",
];

function normalizeExtractedJobPosting(value: unknown): ExtractedJobPostingOutput {
  const raw = (value ?? {}) as Record<string, unknown>;
  const brief = (raw.briefData ?? {}) as Record<string, unknown>;

  const hiringPriorities = Array.isArray(brief.hiringPriorities)
    ? brief.hiringPriorities
        .filter((item): item is TargetRoleBriefData["hiringPriorities"][number] =>
          typeof item === "string" && allowedPriorities.includes(item as TargetRoleBriefData["hiringPriorities"][number]),
        )
        .slice(0, 4)
    : [];

  return {
    sourceUrl: typeof raw.sourceUrl === "string" ? raw.sourceUrl.trim() : "",
    company: typeof raw.company === "string" ? raw.company.trim() : "",
    role: typeof raw.role === "string" ? raw.role.trim() : "",
    location: typeof raw.location === "string" ? raw.location.trim() : "",
    cleanedJobDescription:
      typeof raw.cleanedJobDescription === "string" ? raw.cleanedJobDescription.trim() : "",
    briefData: {
      sourceUrl: typeof brief.sourceUrl === "string" ? brief.sourceUrl.trim() : "",
      seniorityLevel: typeof brief.seniorityLevel === "string" ? brief.seniorityLevel.trim() : "",
      employmentType: typeof brief.employmentType === "string" ? brief.employmentType.trim() : "",
      workMode: typeof brief.workMode === "string" ? brief.workMode.trim() : "",
      industryDomain: typeof brief.industryDomain === "string" ? brief.industryDomain.trim() : "",
      salaryRange: typeof brief.salaryRange === "string" ? brief.salaryRange.trim() : "",
      topRequiredSkills: asStringArray(brief.topRequiredSkills, 20),
      preferredSkills: asStringArray(brief.preferredSkills, 20),
      emphasizeKeywords: asStringArray(brief.emphasizeKeywords, 20),
      responsibilitiesSummary:
        typeof brief.responsibilitiesSummary === "string"
          ? brief.responsibilitiesSummary.trim()
          : "",
      hiringPriorities,
      atsIntensity: typeof brief.atsIntensity === "string" ? brief.atsIntensity.trim() : "",
      technicalIntensity:
        typeof brief.technicalIntensity === "string" ? brief.technicalIntensity.trim() : "",
      recruiterNotes: typeof brief.recruiterNotes === "string" ? brief.recruiterNotes.trim() : "",
    },
  };
}

export class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config?: { apiKey?: string; model?: string }) {
    const apiKey = config?.apiKey ?? requireOpenAIKey();

    this.client = new OpenAI({ apiKey });
    this.model = config?.model ?? getAIModel();
  }

  private async withRetry<T>(operation: string, run: () => Promise<T>): Promise<T> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < 3) {
      try {
        return await run();
      } catch (error) {
        lastError = error;
        attempt += 1;

        const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : null;
        const retryable = status === 408 || status === 409 || status === 429 || (status !== null && status >= 500);

        if (!retryable || attempt >= 3) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      }
    }

    throw new ExternalServiceError(
      `OpenAI ${operation} failed: ${lastError instanceof Error ? lastError.message : "Unknown error."}`,
    );
  }

  private async runStructuredRequest<T>(options: {
    schemaName: string;
    schema: JSONSchema;
    instructions: string;
    input: string;
    normalize: (value: unknown) => T;
  }): Promise<T> {
    const response = await this.withRetry(options.schemaName, async () =>
      (await this.client.responses.create({
        model: this.model,
        store: false,
        instructions: options.instructions,
        input: options.input,
        text: {
          format: {
            type: "json_schema",
            name: options.schemaName,
            schema: options.schema,
            strict: true,
          },
        },
      } as never)) as unknown as { output_text?: string },
    );

    const rawText = typeof response.output_text === "string" ? response.output_text.trim() : "";

    if (!rawText) {
      throw new ExternalServiceError(`OpenAI response for ${options.schemaName} did not include output_text.`);
    }

    return options.normalize(JSON.parse(rawText));
  }

  async analyzeJobDescription(input: AnalyzeJobDescriptionInput): Promise<JDAnalysis> {
    return this.runStructuredRequest({
      schemaName: "job_description_analysis",
      schema: jdAnalysisSchema,
      instructions:
        "You analyze job descriptions for a resume optimization SaaS. Return concise, recruiter-relevant structured JSON only.",
      input: `Analyze this U.S. job description and extract a concise summary, seniority label, top keywords, and must-have requirements.\n\nJob description:\n${input.jobDescriptionText}`,
      normalize: normalizeJDAnalysis,
    });
  }

  async scoreResume(input: ScoreResumeInput): Promise<ResumeAnalysis> {
    const parsedResume = input.parsedResume ?? parseResume(input.resumeText);

    return this.runStructuredRequest({
      schemaName: "resume_analysis",
      schema: resumeAnalysisSchema,
      instructions:
        "You score resumes for ATS-style readiness. Use a 0-100 scale. Stay grounded in the supplied resume and job description. Never invent experience, metrics, technologies, or achievements not present in the resume. Return structured JSON only.",
      input: `Score this resume for ATS readiness, clarity, impact, and job fit against the target job description.

Resume text:
${input.resumeText}

Parsed resume:
${JSON.stringify(parsedResume, null, 2)}

Job description:
${input.jobDescriptionText}`,
      normalize: normalizeResumeAnalysis,
    });
  }

  async rewriteBullet(input: RewriteBulletInput): Promise<RewriteResult> {
    return this.runStructuredRequest({
      schemaName: "rewritten_resume_bullet",
      schema: rewriteResultSchema,
      instructions:
        "You rewrite resume bullets for U.S. tech job seekers. Preserve truthfulness, stay concise, and never invent metrics, technologies, titles, or outcomes that are not supported by the resume context. If evidence is thin, improve clarity without fabricating. Return structured JSON only.",
      input: `Rewrite the bullet below.

Mode: ${input.mode}
Bullet:
${input.bullet}

${input.resumeText ? `Resume context:\n${input.resumeText}\n\n` : ""}${
        input.jobDescriptionText ? `Job description:\n${input.jobDescriptionText}` : ""
      }`,
      normalize: normalizeRewriteResult,
    });
  }

  async generateTailoredResume(
    input: GenerateTailoredResumeInput,
  ): Promise<TailoredResumeOutput> {
    const parsedResume = parseResume(input.resumeText);

    return this.runStructuredRequest({
      schemaName: "tailored_resume_version",
      schema: tailoredResumeSchema,
      instructions:
        "You generate job-tailored resume versions for a resume optimization SaaS. Preserve factual accuracy, optimize for U.S. recruiter readability, and never fabricate achievements, numbers, employers, dates, skills, certifications, or scope not present in the resume. Prefer omission over invention. Return structured JSON only.",
      input: `Generate a tailored resume version.

Company: ${input.company}
Role: ${input.jobRole}

Resume text:
${input.resumeText}

Parsed resume:
${JSON.stringify(parsedResume, null, 2)}

Job description:
${input.jobDescriptionText}`,
      normalize: normalizeTailoredResume,
    });
  }

  async generateResumeDraft(input: GenerateResumeDraftInput): Promise<ResumeDraftOutput> {
    const languageLabel = input.outputLanguage === "zh" ? "Chinese (Simplified)" : "English";

    return this.runStructuredRequest({
      schemaName: "guided_resume_draft",
      schema: resumeDraftSchema,
      instructions:
        "You are an expert U.S. resume writer for a SaaS resume assistant. Improve clarity, structure, and impact while preserving factual truth. Never invent achievements, numbers, employers, dates, skills, certifications, projects, or claims not grounded in user-provided input. If evidence is weak, keep wording conservative. Produce output in the requested language only.",
      input: `Generate a polished resume draft from structured profile data.

Required output language: ${languageLabel}
Template style: ${input.templateId}
Tone preference: ${input.resumeStyle || "not specified"}
Keyword emphasis: ${input.keywordEmphasis || "not specified"}
Industry preference: ${input.industryPreference || "not specified"}
Target role: ${input.role || "not specified"}
Target company: ${input.company || "not specified"}

Target job description:
${input.jobDescriptionText || "N/A"}

Structured profile JSON:
${JSON.stringify(input.profileData, null, 2)}

Requirements:
1. Remove redundancy and placeholder-like content.
2. Keep concise recruiter-ready hierarchy.
3. Use achievement-oriented phrasing when supported by facts.
4. Omit empty sections.
5. Return both structured sections and one final plain-text resume content.`,
      normalize: (value) => normalizeResumeDraft(value, input.outputLanguage),
    });
  }

  async extractJobPosting(input: ExtractJobPostingInput): Promise<ExtractedJobPostingOutput> {
    return this.runStructuredRequest({
      schemaName: "job_posting_extract",
      schema: jobPostingExtractSchema,
      instructions:
        "You extract structured hiring information from public job postings for a resume optimization product. Be conservative and factual. Do not infer unknown fields. Keep empty strings/arrays when uncertain.",
      input: `Extract a structured role brief from this public job posting content.

Source URL: ${input.sourceUrl}

Job posting text:
${input.jobPostingText}

Rules:
1. Keep output grounded to provided text.
2. Do not fabricate salary or employer details.
3. Preserve meaningful job-description body in cleanedJobDescription.
4. Return output in concise U.S. recruiting terminology.`,
      normalize: normalizeExtractedJobPosting,
    });
  }
}
