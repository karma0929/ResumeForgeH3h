import type { ParsedResume, ResumeSection } from "@/lib/types";
import { titleCase } from "@/lib/utils";

const SECTION_ALIASES: Record<string, string> = {
  summary: "summary",
  "professional summary": "summary",
  "个人摘要": "summary",
  "职业摘要": "summary",
  profile: "summary",
  experience: "experience",
  "work experience": "experience",
  "工作经历": "experience",
  "实习经历": "experience",
  employment: "experience",
  projects: "projects",
  project: "projects",
  "项目经历": "projects",
  skills: "skills",
  technical: "skills",
  "技能": "skills",
  education: "education",
  "教育背景": "education",
  certifications: "certifications",
  "证书": "certifications",
  "认证": "certifications",
  involvement: "leadership",
  leadership: "leadership",
  "领导力": "leadership",
  awards: "awards",
  "奖项": "awards",
  links: "links",
  "个人链接": "links",
};

const BULLET_REGEX = /^[-*•]\s*/;

function normalizeLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function detectHeading(line: string) {
  const normalized = normalizeLine(line).toLowerCase().replace(/:$/, "");
  return SECTION_ALIASES[normalized];
}

function humanizeSection(key: string) {
  return titleCase(key);
}

export function parseResume(resumeText: string): ParsedResume {
  const lines = resumeText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

  const sections = new Map<string, ResumeSection>();
  let currentKey = "general";

  sections.set(currentKey, {
    key: currentKey,
    title: humanizeSection(currentKey),
    lines: [],
    bullets: [],
  });

  for (const line of lines) {
    const nextKey = detectHeading(line);

    if (nextKey) {
      currentKey = nextKey;

      if (!sections.has(currentKey)) {
        sections.set(currentKey, {
          key: currentKey,
          title: humanizeSection(currentKey),
          lines: [],
          bullets: [],
        });
      }

      continue;
    }

    const section = sections.get(currentKey);

    if (!section) {
      continue;
    }

    if (BULLET_REGEX.test(line)) {
      section.bullets.push(line.replace(BULLET_REGEX, "").trim());
    }

    section.lines.push(line);
  }

  const finalSections = Array.from(sections.values()).filter(
    (section) => section.lines.length || section.bullets.length,
  );

  const skillsSection = finalSections.find((section) => section.key === "skills");
  const skills = Array.from(
    new Set(
      (skillsSection?.lines ?? [])
        .join(",")
        .split(/[|,]/)
        .map((skill) => skill.trim())
        .filter(Boolean),
    ),
  );

  const experienceBullets = finalSections
    .filter((section) => ["experience", "projects", "leadership"].includes(section.key))
    .flatMap((section) => section.bullets);

  const contactLine =
    lines.find((line) => /@|linkedin|github|\(\d{3}\)|\d{3}[-.\s]\d{3}/i.test(line)) ?? "";

  return {
    plainText: lines.join("\n"),
    contactLine,
    sections: finalSections,
    skills,
    experienceBullets,
  };
}
