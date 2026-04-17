import type {
  AIProvider,
  AIProviderMode,
  AnalyzeJobDescriptionInput,
  GenerateTailoredResumeInput,
  RewriteBulletInput,
  ScoreResumeInput,
} from "@/lib/ai/types";
import { MockAIProvider } from "@/lib/ai/providers/mock-provider";
import { OpenAIProvider } from "@/lib/ai/providers/openai-provider";
import { allowDevelopmentMocks, getOptionalEnv } from "@/lib/env";
import { ConfigurationError, ExternalServiceError } from "@/lib/errors";
import { logEvent } from "@/lib/logger";

class FallbackAIProvider implements AIProvider {
  readonly name = "openai" as const;

  constructor(
    private readonly primary: AIProvider,
    private readonly fallback: AIProvider,
  ) {}

  private async runWithFallback<T>(operation: string, runPrimary: () => Promise<T>, runFallback: () => Promise<T>) {
    try {
      return await runPrimary();
    } catch (error) {
      logEvent("warn", "ResumeForge AI fallback activated.", {
        operation,
        error: error instanceof Error ? error.message : String(error),
      });
      return runFallback();
    }
  }

  analyzeJobDescription(input: AnalyzeJobDescriptionInput) {
    return this.runWithFallback(
      "analyzeJobDescription",
      () => this.primary.analyzeJobDescription(input),
      () => this.fallback.analyzeJobDescription(input),
    );
  }

  scoreResume(input: ScoreResumeInput) {
    return this.runWithFallback(
      "scoreResume",
      () => this.primary.scoreResume(input),
      () => this.fallback.scoreResume(input),
    );
  }

  rewriteBullet(input: RewriteBulletInput) {
    return this.runWithFallback(
      "rewriteBullet",
      () => this.primary.rewriteBullet(input),
      () => this.fallback.rewriteBullet(input),
    );
  }

  generateTailoredResume(input: GenerateTailoredResumeInput) {
    return this.runWithFallback(
      "generateTailoredResume",
      () => this.primary.generateTailoredResume(input),
      () => this.fallback.generateTailoredResume(input),
    );
  }
}

function currentProviderMode(): AIProviderMode {
  const mode = getOptionalEnv("AI_PROVIDER");

  if (mode === "mock" || mode === "openai") {
    return mode;
  }

  return "auto";
}

export function getAIService(options?: {
  mode?: AIProviderMode;
  preferLive?: boolean;
}): AIProvider {
  const mode = options?.mode ?? currentProviderMode();
  const preferLive = options?.preferLive ?? false;
  const hasOpenAIKey = Boolean(getOptionalEnv("OPENAI_API_KEY"));

  if (mode === "mock") {
    if (!allowDevelopmentMocks) {
      throw new ConfigurationError("AI_PROVIDER=mock is only allowed in local development.");
    }

    return new MockAIProvider();
  }

  if (mode === "openai") {
    return new OpenAIProvider();
  }

  if (!allowDevelopmentMocks) {
    if (!hasOpenAIKey) {
      throw new ExternalServiceError("OpenAI is not configured for this environment.");
    }

    return new OpenAIProvider();
  }

  if (preferLive && hasOpenAIKey) {
    return new FallbackAIProvider(new OpenAIProvider(), new MockAIProvider());
  }

  return new MockAIProvider();
}

export function getPreviewAIService(): AIProvider {
  if (allowDevelopmentMocks) {
    return new MockAIProvider();
  }

  return new OpenAIProvider();
}
