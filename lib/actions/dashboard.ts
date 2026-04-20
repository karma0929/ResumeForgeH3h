"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { trackEvent } from "@/lib/analytics";
import { getSessionIdentity } from "@/lib/auth";
import { requireFeatureAccess } from "@/lib/billing/guards";
import { RateLimitError, ValidationError } from "@/lib/errors";
import {
  createJobDescriptionRecord,
  createResumeRecord,
  generateGuidedResumeDraft,
  generateTailoredResumeDraft,
  createTailoredResumeVersion,
  incrementUsageCounter,
  saveAnalysisGeneration,
  saveBulletRewrite,
  updateUserSettings,
  getAppSnapshot,
} from "@/lib/data";
import { assertUsageCooldown, getUsageUpgradePrompt, hasUsageRemaining } from "@/lib/usage";
import { assertEnumValue, readStringField } from "@/lib/validation";
import { parseJobPostingFromUrl } from "@/lib/services/job-posting-parser";
import { pickText } from "@/lib/i18n";
import { getUiLanguage } from "@/lib/i18n-server";
import type {
  CareerLevel,
  ResumeIntakeMode,
  ResumeProfileData,
  RewriteMode,
  TargetRoleBriefData,
  UILanguage,
} from "@/lib/types";
import { splitCsv, splitMultiline } from "@/lib/workshop";

async function requireSnapshot() {
  const identity = await getSessionIdentity();

  if (!identity) {
    redirect("/login");
  }

  return getAppSnapshot(identity);
}

function redirectForUsageLimit(action: "analysis" | "bullet_rewrite") {
  const prompt = getUsageUpgradePrompt(action);
  redirect(`/dashboard/billing?usageLimit=${action}&targetPlan=${prompt.targetPlan}&blocked=1`);
}

function readLines(formData: FormData, key: string, max = 3000) {
  return splitMultiline(readStringField(formData, key, { max }));
}

function readCsv(formData: FormData, key: string, max = 2000) {
  return splitCsv(readStringField(formData, key, { max }));
}

function readValueWithFallback(
  formData: FormData,
  key: string,
  options: { max?: number; min?: number; required?: boolean },
  fallback: string,
) {
  if (!formData.has(key)) {
    return fallback;
  }

  return readStringField(formData, key, {
    max: options.max,
    min: options.min,
    required: options.required,
  });
}

function parseWizardStep(value: string) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 1 || parsed > 10) {
    return null;
  }

  return parsed;
}

function compactLines(lines: Array<string | null | undefined>) {
  return lines.map((line) => (line ?? "").trim()).filter(Boolean);
}

function buildUploadRedirectPath(input: {
  basePath: string;
  step: number | null;
  query: Record<string, string>;
}) {
  const params = new URLSearchParams(input.query);

  if (input.step) {
    params.set("step", String(input.step));
  }

  return `${input.basePath}?${params.toString()}`;
}

function rethrowRedirect(error: unknown) {
  if (isRedirectError(error)) {
    throw error;
  }
}

const validationMessageZhMap: Record<string, string> = {
  "title must be at least 3 characters.": "简历标题至少需要 3 个字符。",
  "quickResumeText must be at least 40 characters.": "快速模式下简历正文至少需要 40 个字符。",
  "role must be at least 2 characters.": "目标岗位至少需要 2 个字符。",
  "Add at least your basic profile before generating.": "请先补充基础身份信息后再生成。",
  "Enter a valid public job posting URL.": "请输入有效的公开岗位链接。",
  "Only http/https job posting URLs are supported.": "仅支持 http/https 的岗位链接。",
  "Private or local URLs are not allowed.": "不支持本地或内网链接。",
  "The provided URL is not an HTML job posting page.": "该链接不是可解析的岗位网页。",
  "Job posting page content is too short to parse.": "岗位页面内容过短，无法解析。",
  "Could not extract enough readable text from that URL.": "未能从该链接提取足够文本内容。",
  "This job posting page appears protected by anti-bot checks. Paste the job description text manually.":
    "该页面存在反爬限制，建议手动粘贴岗位描述文本。",
};

function localizeActionErrorMessage(input: {
  error: unknown;
  uiLanguage: UILanguage;
  fallbackEn: string;
  fallbackZh: string;
}) {
  if (input.error instanceof ValidationError) {
    if (input.uiLanguage === "zh") {
      return validationMessageZhMap[input.error.message] ?? "输入信息有误，请检查后重试。";
    }
    return input.error.message;
  }

  if (input.error instanceof Error && input.uiLanguage === "zh") {
    if (input.error.message.startsWith("Unable to fetch job posting URL")) {
      return "岗位链接暂时无法访问，请稍后重试或手动粘贴岗位描述。";
    }
  }

  return pickText(input.uiLanguage, input.fallbackEn, input.fallbackZh);
}

export async function saveResumeAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    const returnToRaw = readStringField(formData, "returnTo", { max: 200, fallback: "/dashboard/upload" });
    const returnTo =
      returnToRaw.startsWith("/") && !returnToRaw.startsWith("//") ? returnToRaw : "/dashboard/upload";
    const currentStep = parseWizardStep(readStringField(formData, "currentStep", { max: 10, fallback: "" }));
    const nextStep = parseWizardStep(readStringField(formData, "nextStep", { max: 10, fallback: "" }));
    const intent = readStringField(formData, "intent", { max: 20, fallback: "save" });
    const isDraft = intent === "draft";
    const intakeMode = assertEnumValue(
      readValueWithFallback(formData, "intakeMode", { max: 20 }, snapshot.resumes[0]?.intakeMode ?? "quick"),
      ["quick", "guided"] as const,
      "intakeMode",
    ) as ResumeIntakeMode;
    const resumeId = readStringField(formData, "resumeId", { max: 120 });
    const existingResume = resumeId
      ? snapshot.resumes.find((resume) => resume.id === resumeId) ?? snapshot.resumes[0]
      : snapshot.resumes[0];
    const existingProfile = existingResume?.profileData;
    const titleInput = readValueWithFallback(formData, "title", { max: 120 }, existingResume?.title ?? "");
    const title = titleInput || (intakeMode === "guided" ? "Guided Resume Draft" : "Resume Draft");

    if (!isDraft && title.length < 3) {
      throw new ValidationError("title must be at least 3 characters.");
    }

    const quickResumeText = readValueWithFallback(
      formData,
      "quickResumeText",
      { max: 15000 },
      existingResume?.originalText ?? "",
    );

    if (!isDraft && intakeMode === "quick" && quickResumeText.length < 40) {
      throw new ValidationError("quickResumeText must be at least 40 characters.");
    }

    const careerLevel = readValueWithFallback(
      formData,
      "careerLevel",
      { max: 40 },
      existingProfile?.basicProfile.careerLevel ?? "",
    ) as CareerLevel | "";
    const experienceEntries = [1, 2, 3].map((index) => ({
      company: readValueWithFallback(
        formData,
        `exp${index}_company`,
        { max: 120 },
        existingProfile?.workExperiences[index - 1]?.company ?? "",
      ),
      title: readValueWithFallback(
        formData,
        `exp${index}_title`,
        { max: 120 },
        existingProfile?.workExperiences[index - 1]?.title ?? "",
      ),
      location: readValueWithFallback(
        formData,
        `exp${index}_location`,
        { max: 120 },
        existingProfile?.workExperiences[index - 1]?.location ?? "",
      ),
      dates: readValueWithFallback(
        formData,
        `exp${index}_dates`,
        { max: 80 },
        existingProfile?.workExperiences[index - 1]?.dates ?? "",
      ),
      responsibilities: readValueWithFallback(
        formData,
        `exp${index}_responsibilities`,
        { max: 800 },
        existingProfile?.workExperiences[index - 1]?.responsibilities ?? "",
      ),
      achievements: readValueWithFallback(
        formData,
        `exp${index}_achievements`,
        { max: 800 },
        existingProfile?.workExperiences[index - 1]?.achievements ?? "",
      ),
      quantifiedImpact: readValueWithFallback(
        formData,
        `exp${index}_quantifiedImpact`,
        { max: 500 },
        existingProfile?.workExperiences[index - 1]?.quantifiedImpact ?? "",
      ),
    }));

    const hasStructuredEducationFields = [1, 2, 3].some((index) =>
      formData.has(`edu${index}_school`) ||
      formData.has(`edu${index}_degree`) ||
      formData.has(`edu${index}_major`) ||
      formData.has(`edu${index}_graduationDate`) ||
      formData.has(`edu${index}_gpa`) ||
      formData.has(`edu${index}_honors`) ||
      formData.has(`edu${index}_coursework`),
    );

    const structuredEducation = hasStructuredEducationFields
      ? [1, 2, 3]
          .map((index) => {
            const school = readValueWithFallback(
              formData,
              `edu${index}_school`,
              { max: 120 },
              "",
            );
            const degree = readValueWithFallback(
              formData,
              `edu${index}_degree`,
              { max: 120 },
              "",
            );
            const major = readValueWithFallback(
              formData,
              `edu${index}_major`,
              { max: 120 },
              "",
            );
            const graduationDate = readValueWithFallback(
              formData,
              `edu${index}_graduationDate`,
              { max: 80 },
              "",
            );
            const gpa = readValueWithFallback(formData, `edu${index}_gpa`, { max: 40 }, "");
            const honors = readValueWithFallback(formData, `edu${index}_honors`, { max: 200 }, "");
            const coursework = readValueWithFallback(
              formData,
              `edu${index}_coursework`,
              { max: 300 },
              "",
            );

            if (!school && !degree && !major) {
              return "";
            }

            const headline = compactLines([
              school,
              [degree, major].filter(Boolean).join(" in "),
            ]).join(" | ");
            const details = compactLines([
              graduationDate ? `Graduation: ${graduationDate}` : "",
              gpa ? `GPA: ${gpa}` : "",
              honors ? `Honors: ${honors}` : "",
              coursework ? `Coursework: ${coursework}` : "",
            ]).join(" | ");

            return compactLines([headline, details]).join(" — ");
          })
          .filter(Boolean)
      : [];

    const hasStructuredProjectFields = [1, 2, 3].some((index) =>
      formData.has(`project${index}_name`) ||
      formData.has(`project${index}_role`) ||
      formData.has(`project${index}_dates`) ||
      formData.has(`project${index}_technologies`) ||
      formData.has(`project${index}_description`) ||
      formData.has(`project${index}_impact`),
    );

    const structuredProjects = hasStructuredProjectFields
      ? [1, 2, 3]
          .map((index) => {
            const name = readValueWithFallback(formData, `project${index}_name`, { max: 120 }, "");
            const role = readValueWithFallback(formData, `project${index}_role`, { max: 120 }, "");
            const dates = readValueWithFallback(formData, `project${index}_dates`, { max: 80 }, "");
            const technologies = readValueWithFallback(
              formData,
              `project${index}_technologies`,
              { max: 200 },
              "",
            );
            const description = readValueWithFallback(
              formData,
              `project${index}_description`,
              { max: 600 },
              "",
            );
            const impact = readValueWithFallback(formData, `project${index}_impact`, { max: 400 }, "");

            if (!name && !description) {
              return "";
            }

            const headline = compactLines([
              name,
              role ? `Role: ${role}` : "",
              dates,
            ]).join(" | ");
            const body = compactLines([
              technologies ? `Technologies: ${technologies}` : "",
              description,
              impact ? `Impact: ${impact}` : "",
            ]).join(" — ");

            return compactLines([headline, body]).join(" — ");
          })
          .filter(Boolean)
      : [];

    const hasSkillBuckets =
      formData.has("languagesCsv") ||
      formData.has("frameworksCsv") ||
      formData.has("toolsPlatformsCsv") ||
      formData.has("softSkillsCsv") ||
      formData.has("domainKnowledgeCsv");

    const bucketSkills = hasSkillBuckets
      ? [
          ...readCsv(formData, "languagesCsv", 1500),
          ...readCsv(formData, "frameworksCsv", 1500),
          ...readCsv(formData, "toolsPlatformsCsv", 1500),
          ...readCsv(formData, "softSkillsCsv", 1500),
          ...readCsv(formData, "domainKnowledgeCsv", 1500),
        ].filter(Boolean)
      : [];

    const uniqueSkills = bucketSkills.length > 0 ? Array.from(new Set(bucketSkills)) : null;

    const enhancementNotes = compactLines([
      formData.has("volunteerExperience")
        ? `Volunteer: ${readValueWithFallback(formData, "volunteerExperience", { max: 600 }, "")}`
        : "",
      formData.has("leadershipExperience")
        ? `Leadership: ${readValueWithFallback(formData, "leadershipExperience", { max: 600 }, "")}`
        : "",
      formData.has("extracurriculars")
        ? `Extracurriculars: ${readValueWithFallback(formData, "extracurriculars", { max: 600 }, "")}`
        : "",
      formData.has("publicationsLines")
        ? `Publications: ${readLines(formData, "publicationsLines", 1200).join("; ")}`
        : "",
      formData.has("targetIndustries")
        ? `Target industries: ${readValueWithFallback(formData, "targetIndustries", { max: 300 }, "")}`
        : "",
      formData.has("studentProfessionalPolish")
        ? `Tone preference: ${readValueWithFallback(formData, "studentProfessionalPolish", { max: 120 }, "")}`
        : "",
      formData.has("onePagePreference")
        ? `One-page preference: ${readValueWithFallback(formData, "onePagePreference", { max: 120 }, "")}`
        : "",
      formData.has("summaryStyle")
        ? `Summary style: ${readValueWithFallback(formData, "summaryStyle", { max: 200 }, "")}`
        : "",
      formData.has("sectionEmphasis")
        ? `Section emphasis: ${readValueWithFallback(formData, "sectionEmphasis", { max: 300 }, "")}`
        : "",
    ]);

    const baseNotes = readValueWithFallback(formData, "resumeNotes", { max: 2000 }, existingProfile?.notes ?? "");
    const mergedNotes = compactLines([baseNotes, ...enhancementNotes]).join("\n");

    const profileData: ResumeProfileData = {
      mode: intakeMode,
      basicProfile: {
        fullName: readValueWithFallback(formData, "fullName", { max: 120 }, existingProfile?.basicProfile.fullName ?? ""),
        currentTitle: readValueWithFallback(
          formData,
          "currentTitle",
          { max: 120 },
          existingProfile?.basicProfile.currentTitle ?? "",
        ),
        targetTitle: readValueWithFallback(
          formData,
          "targetTitle",
          { max: 120 },
          existingProfile?.basicProfile.targetTitle ?? "",
        ),
        location: readValueWithFallback(
          formData,
          "profileLocation",
          { max: 120 },
          existingProfile?.basicProfile.location ?? "",
        ),
        workAuthorization: readValueWithFallback(
          formData,
          "workAuthorization",
          { max: 120 },
          existingProfile?.basicProfile.workAuthorization ?? "",
        ),
        yearsExperience: readValueWithFallback(
          formData,
          "yearsExperience",
          { max: 40 },
          existingProfile?.basicProfile.yearsExperience ?? "",
        ),
        careerLevel,
      },
      professionalSummary: readValueWithFallback(
        formData,
        "professionalSummary",
        { max: 2000 },
        existingProfile?.professionalSummary ?? "",
      ),
      skills: uniqueSkills
        ? uniqueSkills
        : formData.has("skillsCsv")
          ? readCsv(formData, "skillsCsv", 3000)
        : (existingProfile?.skills ?? []),
      workExperiences: experienceEntries.filter((entry) => Object.values(entry).some(Boolean)),
      education: structuredEducation.length > 0
        ? structuredEducation
        : formData.has("educationLines")
          ? readLines(formData, "educationLines", 3000)
        : (existingProfile?.education ?? []),
      projects: structuredProjects.length > 0
        ? structuredProjects
        : formData.has("projectLines")
          ? readLines(formData, "projectLines", 3000)
        : (existingProfile?.projects ?? []),
      certifications: formData.has("certificationLines")
        ? readLines(formData, "certificationLines", 2000)
        : (existingProfile?.certifications ?? []),
      awards: formData.has("awardLines")
        ? readLines(formData, "awardLines", 2000)
        : (existingProfile?.awards ?? []),
      links: {
        linkedIn: readValueWithFallback(
          formData,
          "linkedInUrl",
          { max: 240 },
          existingProfile?.links.linkedIn ?? "",
        ),
        github: readValueWithFallback(
          formData,
          "githubUrl",
          { max: 240 },
          existingProfile?.links.github ?? "",
        ),
        portfolio: readValueWithFallback(
          formData,
          "portfolioUrl",
          { max: 240 },
          existingProfile?.links.portfolio ?? "",
        ),
      },
      preferences: {
        resumeStyle: readValueWithFallback(
          formData,
          "resumeStyle",
          { max: 120 },
          existingProfile?.preferences.resumeStyle ?? "",
        ),
        keywordEmphasis: readValueWithFallback(
          formData,
          "keywordEmphasis",
          { max: 400 },
          existingProfile?.preferences.keywordEmphasis ?? "",
        ),
        industryPreference: readValueWithFallback(
          formData,
          "industryPreference",
          { max: 240 },
          existingProfile?.preferences.industryPreference ?? "",
        ),
        outputLanguage: assertEnumValue(
          readValueWithFallback(
            formData,
            "outputLanguage",
            { max: 10 },
            existingProfile?.preferences.outputLanguage ?? "",
          ),
          ["", "en", "zh"] as const,
          "outputLanguage",
        ),
        templateId: assertEnumValue(
          readValueWithFallback(
            formData,
            "templateId",
            { max: 40 },
            existingProfile?.preferences.templateId ?? "",
          ),
          ["", "classic_ats", "modern_professional", "technical_product", "executive_leadership", "minimal_bilingual"] as const,
          "templateId",
        ),
      },
      notes: mergedNotes,
    };

    const shouldCreateVersion =
      intakeMode === "quick"
        ? !isDraft
        : !isDraft && ((nextStep ?? currentStep ?? 0) >= 9);

    await createResumeRecord({
      userId: snapshot.user.id,
      resumeId: resumeId || snapshot.resumes[0]?.id,
      title,
      originalText: quickResumeText,
      intakeMode,
      profileData,
      createVersion: shouldCreateVersion,
      preferOriginalText: intakeMode === "guided" && currentStep === 10 && quickResumeText.trim().length > 0,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/upload");
    revalidatePath("/dashboard/flow/build");
    redirect(
      buildUploadRedirectPath({
        basePath: returnTo,
        step: nextStep ?? currentStep,
        query: {
          resumeSaved: "1",
          ...(isDraft ? { draft: "1" } : {}),
        },
      }),
    );
  } catch (error) {
    rethrowRedirect(error);
    const uiLanguage = await getUiLanguage();
    console.error("saveResumeAction failed", {
      step: readStringField(formData, "currentStep", { max: 10, fallback: "" }),
      nextStep: readStringField(formData, "nextStep", { max: 10, fallback: "" }),
      returnTo: readStringField(formData, "returnTo", { max: 200, fallback: "/dashboard/upload" }),
      intakeMode: readStringField(formData, "intakeMode", { max: 20, fallback: "" }),
      resumeId: readStringField(formData, "resumeId", { max: 120, fallback: "" }),
    });
    console.error(error);
    const message = localizeActionErrorMessage({
      error,
      uiLanguage,
      fallbackEn: "Unable to save resume.",
      fallbackZh: "保存简历失败，请稍后重试。",
    });
    const returnToRaw = readStringField(formData, "returnTo", { max: 200, fallback: "/dashboard/upload" });
    const returnTo =
      returnToRaw.startsWith("/") && !returnToRaw.startsWith("//") ? returnToRaw : "/dashboard/upload";
    const step = parseWizardStep(readStringField(formData, "currentStep", { max: 10, fallback: "" }));
    redirect(
      buildUploadRedirectPath({
        basePath: returnTo,
        step,
        query: { error: message },
      }),
    );
  }
}

export async function saveJobDescriptionAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    const returnToRaw = readStringField(formData, "returnTo", { max: 200, fallback: "/dashboard/upload" });
    const returnTo =
      returnToRaw.startsWith("/") && !returnToRaw.startsWith("//") ? returnToRaw : "/dashboard/upload";
    const currentStep = parseWizardStep(readStringField(formData, "currentStep", { max: 10, fallback: "" }));
    const nextStep = parseWizardStep(readStringField(formData, "nextStep", { max: 10, fallback: "" }));
    const intent = readStringField(formData, "intent", { max: 20, fallback: "save" });
    const isDraft = intent === "draft";
    const jobDescriptionId = readStringField(formData, "jobDescriptionId", { max: 120 });
    const existingJobDescription = jobDescriptionId
      ? snapshot.jobDescriptions.find((jobDescription) => jobDescription.id === jobDescriptionId) ??
        snapshot.jobDescriptions[0]
      : snapshot.jobDescriptions[0];
    const existingBrief = existingJobDescription?.briefData;
    const company = readValueWithFallback(
      formData,
      "company",
      { max: 120 },
      existingJobDescription?.company ?? "",
    );
    const role = readValueWithFallback(
      formData,
      "role",
      { max: 120 },
      existingJobDescription?.role ?? "",
    );
    const location = readValueWithFallback(
      formData,
      "location",
      { max: 120 },
      existingJobDescription?.location ?? "",
    );
    const description = readValueWithFallback(
      formData,
      "description",
      { max: 20000 },
      existingJobDescription?.description ?? "",
    );

    if (!isDraft && role.length < 2) {
      throw new ValidationError("role must be at least 2 characters.");
    }

    const allowedPriorities: TargetRoleBriefData["hiringPriorities"] = [
      "technical_depth",
      "communication",
      "leadership",
      "execution",
      "research",
      "product_thinking",
    ];
    const hiringPriorities = formData.has("hiringPriorities")
      ? formData
          .getAll("hiringPriorities")
          .map((value) => (typeof value === "string" ? value : ""))
          .filter((value): value is TargetRoleBriefData["hiringPriorities"][number] =>
            allowedPriorities.includes(value as TargetRoleBriefData["hiringPriorities"][number]),
          )
      : (existingBrief?.hiringPriorities ?? []);

    const briefData: TargetRoleBriefData = {
      sourceUrl: readValueWithFallback(
        formData,
        "sourceUrl",
        { max: 600 },
        existingBrief?.sourceUrl ?? "",
      ),
      seniorityLevel: readValueWithFallback(
        formData,
        "seniorityLevel",
        { max: 120 },
        existingBrief?.seniorityLevel ?? "",
      ),
      employmentType: readValueWithFallback(
        formData,
        "employmentType",
        { max: 120 },
        existingBrief?.employmentType ?? "",
      ),
      workMode: readValueWithFallback(formData, "workMode", { max: 120 }, existingBrief?.workMode ?? ""),
      industryDomain: readValueWithFallback(
        formData,
        "industryDomain",
        { max: 240 },
        existingBrief?.industryDomain ?? "",
      ),
      salaryRange: readValueWithFallback(
        formData,
        "salaryRange",
        { max: 120 },
        existingBrief?.salaryRange ?? "",
      ),
      topRequiredSkills: formData.has("topRequiredSkills")
        ? readCsv(formData, "topRequiredSkills", 2500)
        : (existingBrief?.topRequiredSkills ?? []),
      preferredSkills: formData.has("preferredSkills")
        ? readCsv(formData, "preferredSkills", 2500)
        : (existingBrief?.preferredSkills ?? []),
      emphasizeKeywords: formData.has("emphasizeKeywords")
        ? readCsv(formData, "emphasizeKeywords", 2500)
        : (existingBrief?.emphasizeKeywords ?? []),
      responsibilitiesSummary: readValueWithFallback(
        formData,
        "responsibilitiesSummary",
        { max: 2000 },
        existingBrief?.responsibilitiesSummary ?? "",
      ),
      hiringPriorities,
      atsIntensity: readValueWithFallback(
        formData,
        "atsIntensity",
        { max: 80 },
        existingBrief?.atsIntensity ?? "",
      ),
      technicalIntensity: readValueWithFallback(
        formData,
        "technicalIntensity",
        { max: 80 },
        existingBrief?.technicalIntensity ?? "",
      ),
      recruiterNotes: readValueWithFallback(
        formData,
        "recruiterNotes",
        { max: 2000 },
        existingBrief?.recruiterNotes ?? "",
      ),
    };

    await createJobDescriptionRecord({
      userId: snapshot.user.id,
      jobDescriptionId: jobDescriptionId || snapshot.jobDescriptions[0]?.id,
      company: company || snapshot.jobDescriptions[0]?.company || "Target Company",
      role: role || snapshot.jobDescriptions[0]?.role || "Target Role",
      location,
      description,
      briefData,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/upload");
    revalidatePath("/dashboard/flow/build");
    redirect(
      buildUploadRedirectPath({
        basePath: returnTo,
        step: nextStep ?? currentStep,
        query: {
          jobDescriptionSaved: "1",
          ...(isDraft ? { draft: "1" } : {}),
        },
      }),
    );
  } catch (error) {
    rethrowRedirect(error);
    const uiLanguage = await getUiLanguage();
    console.error("saveJobDescriptionAction failed", {
      step: readStringField(formData, "currentStep", { max: 10, fallback: "" }),
      nextStep: readStringField(formData, "nextStep", { max: 10, fallback: "" }),
      returnTo: readStringField(formData, "returnTo", { max: 200, fallback: "/dashboard/upload" }),
      jobDescriptionId: readStringField(formData, "jobDescriptionId", { max: 120, fallback: "" }),
      role: readStringField(formData, "role", { max: 120, fallback: "" }),
    });
    console.error(error);
    const message = localizeActionErrorMessage({
      error,
      uiLanguage,
      fallbackEn: "Unable to save job description.",
      fallbackZh: "保存岗位信息失败，请稍后重试。",
    });
    const returnToRaw = readStringField(formData, "returnTo", { max: 200, fallback: "/dashboard/upload" });
    const returnTo =
      returnToRaw.startsWith("/") && !returnToRaw.startsWith("//") ? returnToRaw : "/dashboard/upload";
    const step = parseWizardStep(readStringField(formData, "currentStep", { max: 10, fallback: "" }));
    redirect(
      buildUploadRedirectPath({
        basePath: returnTo,
        step,
        query: { error: message },
      }),
    );
  }
}

export async function parseJobPostingUrlAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    const returnToRaw = readStringField(formData, "returnTo", { max: 200, fallback: "/dashboard/flow/build" });
    const returnTo =
      returnToRaw.startsWith("/") && !returnToRaw.startsWith("//") ? returnToRaw : "/dashboard/flow/build";
    const step = parseWizardStep(readStringField(formData, "currentStep", { max: 10, fallback: "7" })) ?? 7;
    const sourceUrl = readStringField(formData, "jobPostingUrl", {
      required: true,
      max: 600,
    });
    const jobDescriptionId = readStringField(formData, "jobDescriptionId", { max: 120 });
    const existingJob = jobDescriptionId
      ? snapshot.jobDescriptions.find((item) => item.id === jobDescriptionId) ?? snapshot.jobDescriptions[0]
      : snapshot.jobDescriptions[0];

    const extracted = await parseJobPostingFromUrl({ sourceUrl });

    await createJobDescriptionRecord({
      userId: snapshot.user.id,
      jobDescriptionId: existingJob?.id,
      company: extracted.company || existingJob?.company || "Target Company",
      role: extracted.role || existingJob?.role || "Target Role",
      location: extracted.location || existingJob?.location || "",
      description: extracted.cleanedJobDescription,
      briefData: extracted.briefData,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/flow/build");
    revalidatePath("/dashboard/upload");
    redirect(
      buildUploadRedirectPath({
        basePath: returnTo,
        step,
        query: {
          parsed: "1",
          jobDescriptionSaved: "1",
        },
      }),
    );
  } catch (error) {
    rethrowRedirect(error);
    const uiLanguage = await getUiLanguage();
    console.error("parseJobPostingUrlAction failed", {
      returnTo: readStringField(formData, "returnTo", { max: 200, fallback: "/dashboard/flow/build" }),
      step: readStringField(formData, "currentStep", { max: 10, fallback: "7" }),
      sourceUrl: readStringField(formData, "jobPostingUrl", { max: 600, fallback: "" }),
    });
    console.error(error);
    const message = localizeActionErrorMessage({
      error,
      uiLanguage,
      fallbackEn: "Unable to parse this job posting URL.",
      fallbackZh: "无法解析该岗位链接，请手动补充岗位文本。",
    });
    const returnToRaw = readStringField(formData, "returnTo", { max: 200, fallback: "/dashboard/flow/build" });
    const returnTo =
      returnToRaw.startsWith("/") && !returnToRaw.startsWith("//") ? returnToRaw : "/dashboard/flow/build";
    const step = parseWizardStep(readStringField(formData, "currentStep", { max: 10, fallback: "7" })) ?? 7;
    redirect(
      buildUploadRedirectPath({
        basePath: returnTo,
        step,
        query: { error: message },
      }),
    );
  }
}

export async function saveAnalysisAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    requireFeatureAccess(snapshot, "analysis_history");
    const resumeId = readStringField(formData, "resumeId", { required: true, max: 100 });
    const jobDescriptionId = readStringField(formData, "jobDescriptionId", {
      required: true,
      max: 100,
    });

    await saveAnalysisGeneration(
      {
        userId: snapshot.user.id,
        resumeId,
        jobDescriptionId,
      },
      snapshot,
    );

    revalidatePath("/dashboard/analysis");
    redirect(`/dashboard/analysis?resumeId=${resumeId}&jobDescriptionId=${jobDescriptionId}&saved=1`);
  } catch (error) {
    rethrowRedirect(error);
    console.error("saveAnalysisAction failed");
    console.error(error);
    const message = error instanceof ValidationError ? error.message : "Unable to save analysis.";
    redirect(`/dashboard/analysis?error=${encodeURIComponent(message)}`);
  }
}

export async function generateBuildDraftAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    const returnToRaw = readStringField(formData, "returnTo", { max: 200, fallback: "/dashboard/flow/build" });
    const returnTo =
      returnToRaw.startsWith("/") && !returnToRaw.startsWith("//") ? returnToRaw : "/dashboard/flow/build";
    const currentStep = parseWizardStep(readStringField(formData, "currentStep", { max: 10, fallback: "10" })) ?? 10;
    const resumeId = readStringField(formData, "resumeId", { max: 120 });
    const resume = resumeId
      ? snapshot.resumes.find((item) => item.id === resumeId) ?? snapshot.resumes[0]
      : snapshot.resumes[0];

    if (!resume) {
      throw new ValidationError("Add at least your basic profile before generating.");
    }

    await generateGuidedResumeDraft({
      userId: snapshot.user.id,
      resumeId: resume.id,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/flow/build");
    revalidatePath("/dashboard/versions");
    redirect(
      buildUploadRedirectPath({
        basePath: returnTo,
        step: currentStep,
        query: {
          generated: "1",
        },
      }),
    );
  } catch (error) {
    rethrowRedirect(error);
    const uiLanguage = await getUiLanguage();
    console.error("generateBuildDraftAction failed", {
      step: readStringField(formData, "currentStep", { max: 10, fallback: "9" }),
      returnTo: readStringField(formData, "returnTo", { max: 200, fallback: "/dashboard/flow/build" }),
      resumeId: readStringField(formData, "resumeId", { max: 120, fallback: "" }),
    });
    console.error(error);
    const message = localizeActionErrorMessage({
      error,
      uiLanguage,
      fallbackEn: "Unable to generate resume draft.",
      fallbackZh: "生成简历草稿失败，请稍后重试。",
    });
    const step = parseWizardStep(readStringField(formData, "currentStep", { max: 10, fallback: "9" })) ?? 9;
    const returnToRaw = readStringField(formData, "returnTo", { max: 200, fallback: "/dashboard/flow/build" });
    const returnTo =
      returnToRaw.startsWith("/") && !returnToRaw.startsWith("//") ? returnToRaw : "/dashboard/flow/build";
    redirect(
      buildUploadRedirectPath({
        basePath: returnTo,
        step,
        query: { error: message },
      }),
    );
  }
}

export async function runAnalysisAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    const resumeId = readStringField(formData, "resumeId", { required: true, max: 100 });
    const jobDescriptionId = readStringField(formData, "jobDescriptionId", { required: true, max: 100 });

    if (!hasUsageRemaining(snapshot, "analysis")) {
      redirectForUsageLimit("analysis");
    }

    assertUsageCooldown(snapshot.usage, "analysis");

    await saveAnalysisGeneration(
      {
        userId: snapshot.user.id,
        resumeId,
        jobDescriptionId,
      },
      snapshot,
    );

    await incrementUsageCounter({
      userId: snapshot.user.id,
      action: "analysis",
    });
    trackEvent("analysis_run", {
      userId: snapshot.user.id,
      resumeId,
      jobDescriptionId,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/analysis");
    redirect(`/dashboard/analysis?resumeId=${resumeId}&jobDescriptionId=${jobDescriptionId}&ran=1`);
  } catch (error) {
    rethrowRedirect(error);
    console.error("runAnalysisAction failed");
    console.error(error);
    const message =
      error instanceof ValidationError || error instanceof RateLimitError
        ? error.message
        : "Unable to run analysis.";
    redirect(`/dashboard/analysis?error=${encodeURIComponent(message)}`);
  }
}

export async function saveTailoredVersionAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    requireFeatureAccess(snapshot, "tailored_resume");
    const resumeId = readStringField(formData, "resumeId", { required: true, max: 100 });
    const jobDescriptionId = readStringField(formData, "jobDescriptionId", { required: true, max: 100 });
    const customName = readStringField(formData, "customName", { min: 3, max: 120 });

    await createTailoredResumeVersion({
      userId: snapshot.user.id,
      resumeId,
      jobDescriptionId,
      customName,
    }, snapshot);
    trackEvent("tailored_version_saved", {
      userId: snapshot.user.id,
      resumeId,
      jobDescriptionId,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/tailoring");
    revalidatePath("/dashboard/versions");
    redirect(`/dashboard/tailoring?resumeId=${resumeId}&jobDescriptionId=${jobDescriptionId}&draft=1&saved=1`);
  } catch (error) {
    rethrowRedirect(error);
    console.error("saveTailoredVersionAction failed");
    console.error(error);
    const message = error instanceof ValidationError ? error.message : "Unable to save tailored version.";
    redirect(`/dashboard/tailoring?error=${encodeURIComponent(message)}`);
  }
}

export async function runTailoredDraftAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    const resumeId = readStringField(formData, "resumeId", { required: true, max: 100 });
    const jobDescriptionId = readStringField(formData, "jobDescriptionId", { required: true, max: 100 });

    requireFeatureAccess(snapshot, "tailored_resume");
    assertUsageCooldown(snapshot.usage, "tailored_draft");

    await generateTailoredResumeDraft(
      {
        userId: snapshot.user.id,
        resumeId,
        jobDescriptionId,
      },
      snapshot,
    );

    await incrementUsageCounter({
      userId: snapshot.user.id,
      action: "tailored_draft",
    });
    trackEvent("tailored_draft_run", {
      userId: snapshot.user.id,
      resumeId,
      jobDescriptionId,
    });

    revalidatePath("/dashboard/tailoring");
    redirect(`/dashboard/tailoring?resumeId=${resumeId}&jobDescriptionId=${jobDescriptionId}&draft=1`);
  } catch (error) {
    rethrowRedirect(error);
    console.error("runTailoredDraftAction failed");
    console.error(error);
    const message =
      error instanceof ValidationError || error instanceof RateLimitError
        ? error.message
        : "Unable to generate tailored draft.";
    redirect(`/dashboard/tailoring?error=${encodeURIComponent(message)}`);
  }
}

export async function runBulletRewriteAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();
    const resumeId = readStringField(formData, "resumeId", { required: true, max: 100 });
    const jobDescriptionId = readStringField(formData, "jobDescriptionId", { required: true, max: 100 });
    const bullet = readStringField(formData, "bullet", { required: true, min: 10, max: 500 });
    const mode = assertEnumValue(
      readStringField(formData, "mode", { required: true, max: 40 }),
      ["shorter", "more_technical", "leadership_focused", "tailored_to_jd"] as const,
      "mode",
    ) as RewriteMode;

    if (!hasUsageRemaining(snapshot, "bullet_rewrite")) {
      redirectForUsageLimit("bullet_rewrite");
    }

    assertUsageCooldown(snapshot.usage, "bullet_rewrite");

    await saveBulletRewrite(
      {
        userId: snapshot.user.id,
        resumeId,
        jobDescriptionId,
        bullet,
        mode,
      },
      snapshot,
    );

    await incrementUsageCounter({
      userId: snapshot.user.id,
      action: "bullet_rewrite",
    });
    trackEvent("rewrite_run", {
      userId: snapshot.user.id,
      resumeId,
      jobDescriptionId,
      mode,
    });

    redirect(
      `/dashboard/tailoring?resumeId=${resumeId}&jobDescriptionId=${jobDescriptionId}&rewrite=1&mode=${mode}&bullet=${encodeURIComponent(
        bullet,
      )}&rewriteSaved=1`,
    );
  } catch (error) {
    rethrowRedirect(error);
    console.error("runBulletRewriteAction failed");
    console.error(error);
    const message =
      error instanceof ValidationError || error instanceof RateLimitError
        ? error.message
        : "Unable to generate bullet rewrite.";
    redirect(`/dashboard/tailoring?error=${encodeURIComponent(message)}`);
  }
}

export async function updateSettingsAction(formData: FormData) {
  try {
    const snapshot = await requireSnapshot();

    await updateUserSettings({
      userId: snapshot.user.id,
      name: readStringField(formData, "name", { required: true, min: 2, max: 80 }),
      headline: readStringField(formData, "headline", { max: 240 }),
      targetRole: readStringField(formData, "targetRole", { required: true, min: 2, max: 120 }),
      location: readStringField(formData, "location", { max: 120 }),
    });
    trackEvent("settings_updated", { userId: snapshot.user.id });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    redirect("/dashboard/settings?saved=1");
  } catch (error) {
    rethrowRedirect(error);
    console.error("updateSettingsAction failed");
    console.error(error);
    const message = error instanceof ValidationError ? error.message : "Unable to save settings.";
    redirect(`/dashboard/settings?error=${encodeURIComponent(message)}`);
  }
}
