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
  useCase: { en: string; zh: string };
  tags: Array<{ en: string; zh: string }>;
}

export const RESUME_TEMPLATES: ResumeTemplateDefinition[] = [
  {
    id: "classic_ats",
    name: { en: "Classic ATS-safe", zh: "经典 ATS 安全" },
    description: {
      en: "Minimal, highly readable, and recruiter-friendly.",
      zh: "简洁高可读，适配主流 ATS 与招聘筛选。",
    },
    useCase: {
      en: "Default for broad job applications and conservative recruiting pipelines.",
      zh: "适合大多数岗位投递与偏保守的招聘流程。",
    },
    tags: [
      { en: "ATS-safe", zh: "ATS 友好" },
      { en: "Conservative", zh: "稳健风格" },
    ],
  },
  {
    id: "modern_professional",
    name: { en: "Modern professional", zh: "现代专业" },
    description: {
      en: "Stronger visual hierarchy while staying application-safe.",
      zh: "更强视觉层级，同时保持投递稳健。",
    },
    useCase: {
      en: "Best for polished product, business, and cross-functional roles.",
      zh: "适合产品、业务与跨团队协作岗位，风格更精致。",
    },
    tags: [
      { en: "Modern", zh: "现代风格" },
      { en: "Balanced", zh: "均衡表达" },
    ],
  },
  {
    id: "technical_product",
    name: { en: "Technical / product-focused", zh: "技术与产品导向" },
    description: {
      en: "Highlights technical depth, projects, and execution impact.",
      zh: "突出技术深度、项目能力与产出影响。",
    },
    useCase: {
      en: "Ideal for engineering, data, and technical product applicants.",
      zh: "适合工程、数据与技术产品岗位求职者。",
    },
    tags: [
      { en: "Technical", zh: "技术导向" },
      { en: "Project-heavy", zh: "项目突出" },
    ],
  },
  {
    id: "executive_leadership",
    name: { en: "Executive / leadership", zh: "管理与领导力导向" },
    description: {
      en: "Highlights strategy, ownership scope, and cross-functional influence.",
      zh: "突出战略视角、负责范围与跨团队领导力。",
    },
    useCase: {
      en: "Designed for leadership narratives and impact-at-scale storytelling.",
      zh: "适合管理层叙事与大范围影响力表达。",
    },
    tags: [
      { en: "Leadership", zh: "领导力" },
      { en: "Executive", zh: "管理层" },
    ],
  },
  {
    id: "minimal_bilingual",
    name: { en: "Minimal bilingual-friendly", zh: "极简双语友好" },
    description: {
      en: "Balanced spacing and typography for English/Chinese readability.",
      zh: "针对中英文混合阅读优化的极简版式。",
    },
    useCase: {
      en: "Great for bilingual applications and mixed Chinese/English portfolios.",
      zh: "适合中英文双语投递与混合语言履历。",
    },
    tags: [
      { en: "Bilingual", zh: "双语友好" },
      { en: "Minimal", zh: "极简布局" },
    ],
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

export function getTemplatePreviewModel(input: {
  templateId: ResumeTemplateId;
  language: ResumeOutputLanguage;
}): ResumeRenderModel {
  const language = input.language;
  const zh = language === "zh";

  return {
    language,
    templateId: input.templateId,
    name: zh ? "王晨 · 软件工程师" : "Alex Chen · Software Engineer",
    headline: zh
      ? "后端与平台工程 · 旧金山湾区"
      : "Backend & Platform Engineer · San Francisco Bay Area",
    contactLine: zh
      ? "邮箱：alex@example.com ｜ GitHub: github.com/alexchen"
      : "Email: alex@example.com | GitHub: github.com/alexchen",
    summary: zh
      ? "4 年后端与平台开发经验，专注高可用 API、可观测性与交付效率优化。擅长将复杂需求转化为稳定可扩展的工程方案。"
      : "4 years of backend and platform engineering experience focused on scalable APIs, observability, and delivery velocity. Strong track record translating ambiguous product needs into reliable systems.",
    sections: [
      {
        key: "skills",
        title: zh ? "技能" : "SKILLS",
        lines: [
          zh
            ? "TypeScript, Node.js, Go, PostgreSQL, Redis, Docker, AWS"
            : "TypeScript, Node.js, Go, PostgreSQL, Redis, Docker, AWS",
        ],
        bullets: [],
      },
      {
        key: "experience",
        title: zh ? "工作经历" : "EXPERIENCE",
        lines: [
          zh
            ? "NovaPay ｜ 后端工程师 ｜ 2022–至今"
            : "NovaPay | Backend Engineer | 2022–Present",
        ],
        bullets: [
          zh
            ? "重构账务对账流水线，将失败重试率降低 38%，并将日终处理时间缩短 27%。"
            : "Re-architected reconciliation pipeline, reducing failed retry volume by 38% and end-of-day processing time by 27%.",
          zh
            ? "主导服务可观测性标准化，平均故障定位时间从 42 分钟降至 15 分钟。"
            : "Led observability standardization, reducing average incident diagnosis time from 42 minutes to 15 minutes.",
        ],
      },
      {
        key: "projects",
        title: zh ? "项目经历" : "PROJECTS",
        lines: [
          zh
            ? "内部发布平台：构建灰度发布控制台，支持跨服务版本回滚。"
            : "Internal Release Control: Built staged rollout console with cross-service rollback orchestration.",
        ],
        bullets: [],
      },
      {
        key: "education",
        title: zh ? "教育背景" : "EDUCATION",
        lines: [
          zh
            ? "伊利诺伊大学香槟分校 ｜ 计算机科学硕士"
            : "University of Illinois Urbana-Champaign | M.S. Computer Science",
        ],
        bullets: [],
      },
      {
        key: "links",
        title: zh ? "链接" : "LINKS",
        lines: [],
        bullets: ["linkedin.com/in/alexchen", "github.com/alexchen"],
      },
    ],
    footer: zh ? "模板预览 · ResumeForge" : "Template preview · ResumeForge",
  };
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
    value === "technical_product" ||
    value === "executive_leadership" ||
    value === "minimal_bilingual"
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
  const contentSections = createSectionsFromText(input.version.content, language);
  const profileSections = createSectionsFromProfile(profile, language);
  const sections = contentSections.length >= 2 ? contentSections : profileSections;

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
