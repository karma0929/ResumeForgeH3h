import type {
  CareerLevel,
  ResumeIntakeMode,
  ResumeOutputLanguage,
  ResumeProfileData,
  ResumeTemplateId,
  TargetRoleBriefData,
} from "@/lib/types";

function clean(value: string | null | undefined) {
  return (value ?? "").trim();
}

function cleanList(values: Array<string | null | undefined>) {
  return values.map((value) => clean(value)).filter(Boolean);
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>();
  const normalized = values
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

  return normalized;
}

function normalizeOutputLanguage(value: string | null | undefined): ResumeOutputLanguage | "" {
  if (value === "zh" || value === "en") {
    return value;
  }
  return "";
}

function normalizeTemplateId(value: string | null | undefined): ResumeTemplateId | "" {
  if (
    value === "classic_ats" ||
    value === "modern_professional" ||
    value === "technical_product" ||
    value === "executive_leadership" ||
    value === "minimal_bilingual"
  ) {
    return value;
  }
  return "";
}

function detectContentLanguage(value: string): ResumeOutputLanguage {
  return /[\u3400-\u9fff]/.test(value) ? "zh" : "en";
}

function profileHasStructuredContent(profile: ResumeProfileData) {
  return Boolean(
    clean(profile.basicProfile.fullName) ||
      clean(profile.professionalSummary) ||
      profile.skills.length > 0 ||
      profile.workExperiences.length > 0 ||
      profile.education.length > 0 ||
      profile.projects.length > 0,
  );
}

const EN_SECTION_PLACEHOLDERS = new Set([
  "summary",
  "skills",
  "experience",
  "work experience",
  "education",
  "projects",
  "certifications",
  "awards",
  "links",
]);

const ZH_SECTION_PLACEHOLDERS = new Set([
  "摘要",
  "个人摘要",
  "技能",
  "经验",
  "工作经验",
  "教育",
  "项目",
  "证书",
  "奖项",
  "链接",
]);

function isPlaceholderValue(value: string) {
  const normalized = value.replace(/[:：]/g, "").trim().toLowerCase();
  return EN_SECTION_PLACEHOLDERS.has(normalized) || ZH_SECTION_PLACEHOLDERS.has(value.trim());
}

function sanitizeFallbackResumeText(value: string) {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line, index, arr) => {
      if (index === 0) {
        return true;
      }
      return line.toLowerCase() !== arr[index - 1]?.toLowerCase();
    })
    .filter((line) => !isPlaceholderValue(line));

  return lines.join("\n").trim();
}

function toBullets(value: string) {
  if (!value) {
    return [];
  }

  const rows = value
    .split(/\r?\n|[;；]\s*/)
    .map((item) => item.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);

  return dedupeStrings(rows);
}

function sectionTitle(key: string, language: ResumeOutputLanguage) {
  const zh = {
    summary: "个人摘要",
    skills: "技能",
    experience: "工作经历",
    education: "教育背景",
    projects: "项目经历",
    certifications: "证书",
    awards: "奖项",
    links: "链接",
  } as const;

  const en = {
    summary: "SUMMARY",
    skills: "SKILLS",
    experience: "EXPERIENCE",
    education: "EDUCATION",
    projects: "PROJECTS",
    certifications: "CERTIFICATIONS",
    awards: "AWARDS",
    links: "LINKS",
  } as const;

  if (language === "zh") {
    return zh[key as keyof typeof zh] ?? key;
  }

  return en[key as keyof typeof en] ?? key.toUpperCase();
}

function formatTargetLabel(value: string, language: ResumeOutputLanguage) {
  if (!value) {
    return "";
  }
  return language === "zh" ? `目标岗位：${value}` : `Target: ${value}`;
}

function synthesizeSummary(profile: ResumeProfileData, language: ResumeOutputLanguage) {
  const currentTitle = clean(profile.basicProfile.currentTitle);
  const targetTitle = clean(profile.basicProfile.targetTitle);
  const years = clean(profile.basicProfile.yearsExperience);
  const location = clean(profile.basicProfile.location);

  if (language === "zh") {
    const parts = cleanList([
      years ? `${years}年经验` : "",
      currentTitle || targetTitle,
      location,
    ]);
    if (parts.length === 0) {
      return "";
    }

    return targetTitle && currentTitle !== targetTitle
      ? `${parts.join("，")}。当前求职方向为${targetTitle}，重点突出可量化成果与岗位匹配能力。`
      : `${parts.join("，")}。重点突出可量化成果与岗位匹配能力。`;
  }

  const head = cleanList([
    years ? `${years} years of experience` : "",
    currentTitle || targetTitle,
    location,
  ]);

  if (head.length === 0) {
    return "";
  }

  const targetSentence =
    targetTitle && currentTitle !== targetTitle ? ` targeting ${targetTitle}` : "";

  return `${head.join(" • ")}${targetSentence}. Focused on measurable impact and role-relevant execution.`;
}

export function splitMultiline(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function splitCsv(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function createDefaultResumeProfileData(mode: ResumeIntakeMode = "quick"): ResumeProfileData {
  return {
    mode,
    basicProfile: {
      fullName: "",
      currentTitle: "",
      targetTitle: "",
      location: "",
      workAuthorization: "",
      yearsExperience: "",
      careerLevel: "",
    },
    professionalSummary: "",
    skills: [],
    workExperiences: [],
    education: [],
    projects: [],
    certifications: [],
    awards: [],
    links: {
      linkedIn: "",
      github: "",
      portfolio: "",
    },
    preferences: {
      resumeStyle: "",
      keywordEmphasis: "",
      industryPreference: "",
      outputLanguage: "",
      templateId: "",
    },
    notes: "",
  };
}

export function createDefaultTargetRoleBriefData(): TargetRoleBriefData {
  return {
    seniorityLevel: "",
    employmentType: "",
    workMode: "",
    industryDomain: "",
    salaryRange: "",
    topRequiredSkills: [],
    preferredSkills: [],
    emphasizeKeywords: [],
    responsibilitiesSummary: "",
    hiringPriorities: [],
    atsIntensity: "",
    technicalIntensity: "",
    recruiterNotes: "",
  };
}

export function normalizeResumeProfileData(
  value: ResumeProfileData | null | undefined,
  mode: ResumeIntakeMode = "quick",
): ResumeProfileData {
  const defaults = createDefaultResumeProfileData(mode);

  if (!value) {
    return defaults;
  }

  return {
    mode: value.mode ?? mode,
    basicProfile: {
      fullName: clean(value.basicProfile?.fullName),
      currentTitle: clean(value.basicProfile?.currentTitle),
      targetTitle: clean(value.basicProfile?.targetTitle),
      location: clean(value.basicProfile?.location),
      workAuthorization: clean(value.basicProfile?.workAuthorization),
      yearsExperience: clean(value.basicProfile?.yearsExperience),
      careerLevel: (value.basicProfile?.careerLevel ?? "") as CareerLevel | "",
    },
    professionalSummary: clean(value.professionalSummary),
    skills: cleanList(value.skills ?? []),
    workExperiences: (value.workExperiences ?? [])
      .map((entry) => ({
        company: clean(entry.company),
        title: clean(entry.title),
        location: clean(entry.location),
        dates: clean(entry.dates),
        responsibilities: clean(entry.responsibilities),
        achievements: clean(entry.achievements),
        quantifiedImpact: clean(entry.quantifiedImpact),
      }))
      .filter((entry) => Object.values(entry).some(Boolean)),
    education: cleanList(value.education ?? []),
    projects: cleanList(value.projects ?? []),
    certifications: cleanList(value.certifications ?? []),
    awards: cleanList(value.awards ?? []),
    links: {
      linkedIn: clean(value.links?.linkedIn),
      github: clean(value.links?.github),
      portfolio: clean(value.links?.portfolio),
    },
    preferences: {
      resumeStyle: clean(value.preferences?.resumeStyle),
      keywordEmphasis: clean(value.preferences?.keywordEmphasis),
      industryPreference: clean(value.preferences?.industryPreference),
      outputLanguage: normalizeOutputLanguage(value.preferences?.outputLanguage),
      templateId: normalizeTemplateId(value.preferences?.templateId),
    },
    notes: clean(value.notes),
  };
}

export function normalizeTargetRoleBriefData(
  value: TargetRoleBriefData | null | undefined,
): TargetRoleBriefData {
  const defaults = createDefaultTargetRoleBriefData();

  if (!value) {
    return defaults;
  }

  return {
    seniorityLevel: clean(value.seniorityLevel),
    employmentType: clean(value.employmentType),
    workMode: clean(value.workMode),
    industryDomain: clean(value.industryDomain),
    salaryRange: clean(value.salaryRange),
    topRequiredSkills: cleanList(value.topRequiredSkills ?? []),
    preferredSkills: cleanList(value.preferredSkills ?? []),
    emphasizeKeywords: cleanList(value.emphasizeKeywords ?? []),
    responsibilitiesSummary: clean(value.responsibilitiesSummary),
    hiringPriorities: (value.hiringPriorities ?? []).filter(Boolean),
    atsIntensity: clean(value.atsIntensity),
    technicalIntensity: clean(value.technicalIntensity),
    recruiterNotes: clean(value.recruiterNotes),
  };
}

function percent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculateResumeProfileCompleteness(input: {
  originalText: string;
  profile: ResumeProfileData;
}) {
  const { originalText, profile } = input;

  let score = 0;

  if (clean(originalText).length >= 120) {
    score += 30;
  }

  if (profile.basicProfile.fullName && profile.basicProfile.targetTitle) {
    score += 15;
  } else if (profile.basicProfile.fullName || profile.basicProfile.targetTitle) {
    score += 8;
  }

  if (profile.professionalSummary.length >= 80) {
    score += 15;
  } else if (profile.professionalSummary.length >= 30) {
    score += 8;
  }

  if (profile.skills.length >= 6) {
    score += 12;
  } else if (profile.skills.length >= 3) {
    score += 6;
  }

  if (profile.workExperiences.length > 0) {
    score += 18;

    if (
      profile.workExperiences.some(
        (entry) =>
          (entry.achievements && /\d/.test(entry.achievements)) ||
          (entry.quantifiedImpact && /\d/.test(entry.quantifiedImpact)),
      )
    ) {
      score += 5;
    }
  }

  if (profile.education.length > 0 || profile.projects.length > 0) {
    score += 5;
  }

  return percent(score);
}

export function calculateTargetRoleBriefCompleteness(input: {
  company: string;
  role: string;
  description: string;
  brief: TargetRoleBriefData;
}) {
  const { company, role, description, brief } = input;

  let score = 0;

  if (clean(company).length >= 2) {
    score += 18;
  }

  if (clean(role).length >= 2) {
    score += 18;
  }

  if (clean(description).length >= 120) {
    score += 30;
  } else if (clean(description).length >= 60) {
    score += 18;
  }

  if (brief.topRequiredSkills.length >= 3) {
    score += 12;
  }

  if (brief.emphasizeKeywords.length >= 3) {
    score += 8;
  }

  if (brief.hiringPriorities.length >= 2) {
    score += 8;
  }

  if (brief.atsIntensity || brief.technicalIntensity || brief.recruiterNotes) {
    score += 6;
  }

  return percent(score);
}

export function buildResumeTextFromProfile(input: {
  title: string;
  profile: ResumeProfileData;
  fallbackText?: string;
}) {
  const fallbackText = clean(input.fallbackText);
  const { profile } = input;
  const outputLanguage =
    profile.preferences.outputLanguage ||
    detectContentLanguage(
      [
        profile.professionalSummary,
        profile.basicProfile.fullName,
        profile.basicProfile.currentTitle,
        profile.basicProfile.targetTitle,
        profile.notes,
        fallbackText,
      ]
        .filter(Boolean)
        .join("\n"),
    );

  if (!profileHasStructuredContent(profile) && fallbackText.length >= 40) {
    return sanitizeFallbackResumeText(fallbackText);
  }

  const lines: string[] = [];
  const headerName = profile.basicProfile.fullName || input.title || (outputLanguage === "zh" ? "简历草稿" : "Resume Draft");
  lines.push(headerName);

  const headerMeta = cleanList([
    profile.basicProfile.currentTitle,
    profile.basicProfile.location,
    formatTargetLabel(profile.basicProfile.targetTitle, outputLanguage),
  ]);

  if (headerMeta.length > 0) {
    lines.push(headerMeta.join(outputLanguage === "zh" ? " ｜ " : " | "));
  }

  const links = cleanList([
    profile.links.linkedIn ? `LinkedIn: ${profile.links.linkedIn}` : "",
    profile.links.github ? `GitHub: ${profile.links.github}` : "",
    profile.links.portfolio ? `${outputLanguage === "zh" ? "作品集" : "Portfolio"}: ${profile.links.portfolio}` : "",
  ]);
  if (links.length > 0) {
    lines.push(links.join(outputLanguage === "zh" ? " ｜ " : " | "));
  }

  const summary = profile.professionalSummary || synthesizeSummary(profile, outputLanguage);
  if (summary) {
    lines.push("");
    lines.push(sectionTitle("summary", outputLanguage));
    lines.push(summary);
  }

  const skills = dedupeStrings(profile.skills.filter((item) => !isPlaceholderValue(item)));
  if (skills.length > 0) {
    lines.push("");
    lines.push(sectionTitle("skills", outputLanguage));
    lines.push(skills.join(", "));
  }

  if (profile.workExperiences.length > 0) {
    lines.push("");
    lines.push(sectionTitle("experience", outputLanguage));

    profile.workExperiences.forEach((entry) => {
      const header = cleanList([
        entry.company,
        entry.title,
        entry.location,
        entry.dates,
      ]).join(outputLanguage === "zh" ? " ｜ " : " | ");
      if (header) {
        lines.push(header);
      }

      const bullets = dedupeStrings(
        cleanList([
          ...toBullets(entry.achievements),
          ...toBullets(entry.responsibilities),
          ...toBullets(entry.quantifiedImpact),
        ]).filter((item) => !isPlaceholderValue(item)),
      );

      bullets.forEach((item) => {
        lines.push(`- ${item}`);
      });
    });
  }

  const education = dedupeStrings(profile.education.filter((item) => !isPlaceholderValue(item)));
  if (education.length > 0) {
    lines.push("");
    lines.push(sectionTitle("education", outputLanguage));
    education.forEach((item) => lines.push(`- ${item}`));
  }

  const projects = dedupeStrings(profile.projects.filter((item) => !isPlaceholderValue(item)));
  if (projects.length > 0) {
    lines.push("");
    lines.push(sectionTitle("projects", outputLanguage));
    projects.forEach((item) => lines.push(`- ${item}`));
  }

  const certifications = dedupeStrings(
    profile.certifications.filter((item) => !isPlaceholderValue(item)),
  );
  if (certifications.length > 0) {
    lines.push("");
    lines.push(sectionTitle("certifications", outputLanguage));
    certifications.forEach((item) => lines.push(`- ${item}`));
  }

  const awards = dedupeStrings(profile.awards.filter((item) => !isPlaceholderValue(item)));
  if (awards.length > 0) {
    lines.push("");
    lines.push(sectionTitle("awards", outputLanguage));
    awards.forEach((item) => lines.push(`- ${item}`));
  }

  if (links.length > 0) {
    lines.push("");
    lines.push(sectionTitle("links", outputLanguage));
    links.forEach((item) => lines.push(`- ${item}`));
  }

  return lines.join("\n").trim();
}

export function buildJobDescriptionText(input: {
  company: string;
  role: string;
  location: string;
  description: string;
  brief: TargetRoleBriefData;
}) {
  const primaryDescription = clean(input.description);

  if (primaryDescription.length >= 80) {
    return primaryDescription;
  }

  const lines: string[] = [];
  const titleLine = cleanList([input.company, input.role, input.location]).join(" | ");
  if (titleLine) {
    lines.push(titleLine);
  }

  if (input.brief.responsibilitiesSummary) {
    lines.push("");
    lines.push("ROLE SUMMARY");
    lines.push(input.brief.responsibilitiesSummary);
  }

  if (input.brief.topRequiredSkills.length > 0) {
    lines.push("");
    lines.push("REQUIRED SKILLS");
    input.brief.topRequiredSkills.forEach((item) => lines.push(`- ${item}`));
  }

  if (input.brief.preferredSkills.length > 0) {
    lines.push("");
    lines.push("PREFERRED SKILLS");
    input.brief.preferredSkills.forEach((item) => lines.push(`- ${item}`));
  }

  if (input.brief.hiringPriorities.length > 0) {
    lines.push("");
    lines.push("HIRING PRIORITIES");
    input.brief.hiringPriorities.forEach((item) => lines.push(`- ${item.replace("_", " ")}`));
  }

  const context = cleanList([
    input.brief.seniorityLevel ? `Seniority: ${input.brief.seniorityLevel}` : "",
    input.brief.employmentType ? `Employment: ${input.brief.employmentType}` : "",
    input.brief.workMode ? `Work mode: ${input.brief.workMode}` : "",
    input.brief.industryDomain ? `Industry: ${input.brief.industryDomain}` : "",
    input.brief.salaryRange ? `Salary: ${input.brief.salaryRange}` : "",
    input.brief.atsIntensity ? `ATS intensity: ${input.brief.atsIntensity}` : "",
    input.brief.technicalIntensity ? `Technical intensity: ${input.brief.technicalIntensity}` : "",
  ]);

  if (context.length > 0) {
    lines.push("");
    lines.push("CONTEXT");
    context.forEach((item) => lines.push(`- ${item}`));
  }

  if (input.brief.emphasizeKeywords.length > 0) {
    lines.push("");
    lines.push("KEYWORDS TO EMPHASIZE");
    lines.push(input.brief.emphasizeKeywords.join(", "));
  }

  if (input.brief.recruiterNotes) {
    lines.push("");
    lines.push("RECRUITER NOTES");
    lines.push(input.brief.recruiterNotes);
  }

  return lines.join("\n").trim();
}
