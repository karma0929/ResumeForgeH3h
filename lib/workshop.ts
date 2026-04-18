import type {
  CareerLevel,
  ResumeIntakeMode,
  ResumeProfileData,
  TargetRoleBriefData,
} from "@/lib/types";

function clean(value: string | null | undefined) {
  return (value ?? "").trim();
}

function cleanList(values: Array<string | null | undefined>) {
  return values.map((value) => clean(value)).filter(Boolean);
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

  if (fallbackText.length >= 40) {
    return fallbackText;
  }

  const { profile } = input;

  const lines: string[] = [];
  const headerName = profile.basicProfile.fullName || input.title || "Resume Profile";
  lines.push(headerName);

  const headerMeta = cleanList([
    profile.basicProfile.currentTitle,
    profile.basicProfile.location,
    profile.basicProfile.targetTitle ? `Target: ${profile.basicProfile.targetTitle}` : "",
  ]);

  if (headerMeta.length > 0) {
    lines.push(headerMeta.join(" | "));
  }

  if (profile.professionalSummary) {
    lines.push("");
    lines.push("SUMMARY");
    lines.push(profile.professionalSummary);
  }

  if (profile.skills.length > 0) {
    lines.push("");
    lines.push("SKILLS");
    lines.push(profile.skills.join(", "));
  }

  if (profile.workExperiences.length > 0) {
    lines.push("");
    lines.push("EXPERIENCE");
    profile.workExperiences.forEach((entry) => {
      const header = cleanList([
        entry.company,
        entry.title,
        entry.location,
        entry.dates,
      ]).join(" | ");
      if (header) {
        lines.push(header);
      }

      cleanList([entry.responsibilities, entry.achievements, entry.quantifiedImpact]).forEach((item) => {
        lines.push(`- ${item}`);
      });
    });
  }

  if (profile.education.length > 0) {
    lines.push("");
    lines.push("EDUCATION");
    profile.education.forEach((item) => lines.push(`- ${item}`));
  }

  if (profile.projects.length > 0) {
    lines.push("");
    lines.push("PROJECTS");
    profile.projects.forEach((item) => lines.push(`- ${item}`));
  }

  if (profile.certifications.length > 0) {
    lines.push("");
    lines.push("CERTIFICATIONS");
    profile.certifications.forEach((item) => lines.push(`- ${item}`));
  }

  if (profile.awards.length > 0) {
    lines.push("");
    lines.push("AWARDS");
    profile.awards.forEach((item) => lines.push(`- ${item}`));
  }

  const links = cleanList([
    profile.links.linkedIn ? `LinkedIn: ${profile.links.linkedIn}` : "",
    profile.links.github ? `GitHub: ${profile.links.github}` : "",
    profile.links.portfolio ? `Portfolio: ${profile.links.portfolio}` : "",
  ]);

  if (links.length > 0) {
    lines.push("");
    lines.push("LINKS");
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

  if (input.brief.recruiterNotes) {
    lines.push("");
    lines.push("RECRUITER NOTES");
    lines.push(input.brief.recruiterNotes);
  }

  return lines.join("\n").trim();
}
