import { parseResume } from "@/lib/services/resume-parser";
import type {
  ResumeOutputLanguage,
  ResumeProfileData,
  ResumeTemplateId,
  ResumeVersionRecord,
} from "@/lib/types";
import { normalizeResumeProfileData } from "@/lib/workshop";

export interface ResumeTemplateDefinition {
  id: ResumeTemplateId;
  name: { en: string; zh: string };
  description: { en: string; zh: string };
}

export const RESUME_TEMPLATES: ResumeTemplateDefinition[] = [
  {
    id: "classic_ats",
    name: { en: "Classic ATS-safe", zh: "经典 ATS 安全" },
    description: {
      en: "Minimal, highly readable, and recruiter-friendly.",
      zh: "简洁高可读，适配主流 ATS 与招聘筛选。",
    },
  },
  {
    id: "modern_professional",
    name: { en: "Modern professional", zh: "现代专业" },
    description: {
      en: "Stronger visual hierarchy while staying application-safe.",
      zh: "更强视觉层级，同时保持投递稳健。",
    },
  },
  {
    id: "technical_product",
    name: { en: "Technical / product-focused", zh: "技术与产品导向" },
    description: {
      en: "Highlights technical depth, projects, and execution impact.",
      zh: "突出技术深度、项目能力与产出影响。",
    },
  },
];

export interface ResumeRenderSection {
  key: string;
  title: string;
  lines: string[];
  bullets: string[];
}

export interface ResumeRenderModel {
  language: ResumeOutputLanguage;
  templateId: ResumeTemplateId;
  name: string;
  headline: string;
  contactLine: string;
  summary: string;
  sections: ResumeRenderSection[];
  footer: string;
}

export function renderModelAsPlainText(model: ResumeRenderModel) {
  const lines: string[] = [];
  lines.push(model.name);

  if (model.headline) {
    lines.push(model.headline);
  }

  if (model.contactLine) {
    lines.push(model.contactLine);
  }

  if (model.summary) {
    lines.push("");
    lines.push(model.language === "zh" ? "个人摘要" : "SUMMARY");
    lines.push(model.summary);
  }

  model.sections.forEach((section) => {
    lines.push("");
    lines.push(section.title);
    section.lines.forEach((line) => lines.push(line));
    section.bullets.forEach((bullet) => lines.push(`- ${bullet}`));
  });

  return lines.join("\n").trim();
}

export function isResumeTemplateId(value: string | null | undefined): value is ResumeTemplateId {
  return (
    value === "classic_ats" ||
    value === "modern_professional" ||
    value === "technical_product"
  );
}

export function isResumeOutputLanguage(
  value: string | null | undefined,
): value is ResumeOutputLanguage {
  return value === "en" || value === "zh";
}

function normalizeLanguage(value: string | null | undefined, fallbackText: string): ResumeOutputLanguage {
  if (isResumeOutputLanguage(value)) {
    return value;
  }
  return /[\u3400-\u9fff]/.test(fallbackText) ? "zh" : "en";
}

function normalizeTemplate(
  value: string | null | undefined,
  fallback: ResumeTemplateId = "classic_ats",
): ResumeTemplateId {
  return isResumeTemplateId(value) ? value : fallback;
}

function sectionTitle(key: string, language: ResumeOutputLanguage) {
  const en: Record<string, string> = {
    summary: "SUMMARY",
    skills: "SKILLS",
    experience: "EXPERIENCE",
    education: "EDUCATION",
    projects: "PROJECTS",
    certifications: "CERTIFICATIONS",
    awards: "AWARDS",
    links: "LINKS",
  };

  const zh: Record<string, string> = {
    summary: "个人摘要",
    skills: "技能",
    experience: "工作经历",
    education: "教育背景",
    projects: "项目经历",
    certifications: "证书",
    awards: "奖项",
    links: "链接",
  };

  if (language === "zh") {
    return zh[key] ?? key;
  }

  return en[key] ?? key.toUpperCase();
}

function dedupe(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const normalized = item.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function isPlaceholder(line: string) {
  const normalized = line.replace(/[:：]/g, "").trim().toLowerCase();
  return [
    "summary",
    "skills",
    "experience",
    "education",
    "projects",
    "certifications",
    "awards",
    "links",
    "个人摘要",
    "技能",
    "工作经历",
    "教育背景",
    "项目经历",
    "证书",
    "奖项",
    "链接",
  ].includes(normalized);
}

function createSectionsFromProfile(
  profile: ResumeProfileData,
  language: ResumeOutputLanguage,
): ResumeRenderSection[] {
  const sections: ResumeRenderSection[] = [];

  const skills = dedupe(profile.skills.filter((item) => !isPlaceholder(item)));
  if (skills.length > 0) {
    sections.push({
      key: "skills",
      title: sectionTitle("skills", language),
      lines: [skills.join(", ")],
      bullets: [],
    });
  }

  const experienceLines: string[] = [];
  const experienceBullets: string[] = [];
  profile.workExperiences.forEach((entry) => {
    const header = [entry.company, entry.title, entry.location, entry.dates]
      .map((item) => item.trim())
      .filter(Boolean)
      .join(language === "zh" ? " ｜ " : " | ");
    if (header) {
      experienceLines.push(header);
    }
    experienceBullets.push(
      ...[entry.achievements, entry.responsibilities, entry.quantifiedImpact]
        .flatMap((item) => item.split(/\r?\n|[;；]\s*/))
        .map((item) => item.replace(/^[-*•]\s*/, "").trim())
        .filter(Boolean),
    );
  });
  if (experienceLines.length > 0 || experienceBullets.length > 0) {
    sections.push({
      key: "experience",
      title: sectionTitle("experience", language),
      lines: dedupe(experienceLines),
      bullets: dedupe(experienceBullets).filter((item) => !isPlaceholder(item)),
    });
  }

  const education = dedupe(profile.education.filter((item) => !isPlaceholder(item)));
  if (education.length > 0) {
    sections.push({
      key: "education",
      title: sectionTitle("education", language),
      lines: [],
      bullets: education,
    });
  }

  const projects = dedupe(profile.projects.filter((item) => !isPlaceholder(item)));
  if (projects.length > 0) {
    sections.push({
      key: "projects",
      title: sectionTitle("projects", language),
      lines: [],
      bullets: projects,
    });
  }

  const certifications = dedupe(profile.certifications.filter((item) => !isPlaceholder(item)));
  if (certifications.length > 0) {
    sections.push({
      key: "certifications",
      title: sectionTitle("certifications", language),
      lines: [],
      bullets: certifications,
    });
  }

  const awards = dedupe(profile.awards.filter((item) => !isPlaceholder(item)));
  if (awards.length > 0) {
    sections.push({
      key: "awards",
      title: sectionTitle("awards", language),
      lines: [],
      bullets: awards,
    });
  }

  const links = dedupe(
    [profile.links.linkedIn, profile.links.github, profile.links.portfolio].filter(Boolean),
  );
  if (links.length > 0) {
    sections.push({
      key: "links",
      title: sectionTitle("links", language),
      lines: [],
      bullets: links,
    });
  }

  return sections;
}

function createSectionsFromText(
  content: string,
  language: ResumeOutputLanguage,
): ResumeRenderSection[] {
  const parsed = parseResume(content);
  return parsed.sections
    .filter((section) => section.key !== "general")
    .map((section) => ({
      key: section.key,
      title: sectionTitle(section.key, language),
      lines: dedupe(section.lines.filter((line) => !isPlaceholder(line))),
      bullets: dedupe(section.bullets.filter((line) => !isPlaceholder(line))),
    }))
    .filter((section) => section.lines.length > 0 || section.bullets.length > 0);
}

function buildHeadline(profile: ResumeProfileData, language: ResumeOutputLanguage) {
  return [profile.basicProfile.currentTitle, profile.basicProfile.location]
    .filter(Boolean)
    .join(language === "zh" ? " ｜ " : " | ");
}

function buildContactLine(profile: ResumeProfileData, language: ResumeOutputLanguage) {
  return [
    profile.basicProfile.targetTitle
      ? language === "zh"
        ? `目标：${profile.basicProfile.targetTitle}`
        : `Target: ${profile.basicProfile.targetTitle}`
      : "",
    profile.links.linkedIn ? `LinkedIn: ${profile.links.linkedIn}` : "",
    profile.links.github ? `GitHub: ${profile.links.github}` : "",
    profile.links.portfolio
      ? language === "zh"
        ? `作品集: ${profile.links.portfolio}`
        : `Portfolio: ${profile.links.portfolio}`
      : "",
  ]
    .filter(Boolean)
    .join(language === "zh" ? " ｜ " : " | ");
}

export function buildResumeRenderModel(input: {
  version: ResumeVersionRecord;
  profileData?: ResumeProfileData | null;
  requestedLanguage?: string | null;
  requestedTemplate?: string | null;
}): ResumeRenderModel {
  const profile = normalizeResumeProfileData(input.profileData ?? null, "guided");
  const language = normalizeLanguage(
    input.requestedLanguage ?? profile.preferences.outputLanguage,
    `${input.version.content}\n${profile.professionalSummary}\n${profile.basicProfile.fullName}`,
  );
  const templateId = normalizeTemplate(
    input.requestedTemplate ?? profile.preferences.templateId,
  );
  const parsed = parseResume(input.version.content);
  const nameFromText = parsed.sections.find((section) => section.key === "general")?.lines[0] ?? "";
  const name = profile.basicProfile.fullName || nameFromText || input.version.name;
  const headline = buildHeadline(profile, language);
  const contactLine = buildContactLine(profile, language) || parsed.contactLine;
  const summary = profile.professionalSummary || input.version.summary || "";
  const sections =
    createSectionsFromProfile(profile, language).length > 0
      ? createSectionsFromProfile(profile, language)
      : createSectionsFromText(input.version.content, language);

  return {
    language,
    templateId,
    name,
    headline,
    contactLine,
    summary,
    sections,
    footer:
      language === "zh"
        ? "由 ResumeForge 生成，可继续编辑后再投递。"
        : "Generated by ResumeForge. Review and edit before submission.",
  };
}
