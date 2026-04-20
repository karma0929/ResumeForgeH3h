import { getAIService } from "@/lib/ai";
import type { ExtractedJobPostingOutput } from "@/lib/ai/types";
import type { TargetRoleBriefData } from "@/lib/types";
import { ExternalServiceError, ValidationError } from "@/lib/errors";
import { logEvent } from "@/lib/logger";

function ensurePublicUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ValidationError("Enter a valid public job posting URL.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ValidationError("Only http/https job posting URLs are supported.");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  ) {
    throw new ValidationError("Private or local URLs are not allowed.");
  }

  return url.toString();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractJsonLdJobPosting(html: string) {
  const scripts = Array.from(
    html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  );

  for (const script of scripts) {
    const raw = script[1]?.trim();
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw);
      const records = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as Record<string, unknown>)["@graph"])
          ? ((parsed as Record<string, unknown>)["@graph"] as unknown[])
          : [parsed];

      for (const record of records) {
        if (!record || typeof record !== "object") {
          continue;
        }

        const typedRecord = record as Record<string, unknown>;
        const typeValue = typedRecord["@type"];
        const types = Array.isArray(typeValue) ? typeValue : [typeValue];
        const isJobPosting = types.some((item) => typeof item === "string" && item.toLowerCase() === "jobposting");

        if (!isJobPosting) {
          continue;
        }

        const hiringOrg =
          typeof typedRecord.hiringOrganization === "object" && typedRecord.hiringOrganization
            ? (typedRecord.hiringOrganization as Record<string, unknown>)
            : null;
        const jobLocation =
          typeof typedRecord.jobLocation === "object" && typedRecord.jobLocation
            ? (typedRecord.jobLocation as Record<string, unknown>)
            : null;
        const address =
          jobLocation && typeof jobLocation.address === "object" && jobLocation.address
            ? (jobLocation.address as Record<string, unknown>)
            : null;

        return {
          title: typeof typedRecord.title === "string" ? normalizeWhitespace(typedRecord.title) : "",
          company: hiringOrg && typeof hiringOrg.name === "string" ? normalizeWhitespace(hiringOrg.name) : "",
          location:
            address && typeof address.addressLocality === "string"
              ? normalizeWhitespace(address.addressLocality)
              : "",
          description:
            typeof typedRecord.description === "string"
              ? normalizeWhitespace(
                  decodeHtmlEntities(
                    typedRecord.description.replace(/<[^>]+>/g, " "),
                  ),
                )
              : "",
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

function keywordListFromText(source: string) {
  return source
    .split(/[\n,;；|]/)
    .map((item) => item.replace(/^[-*•]\s*/, "").trim())
    .filter((item) => item.length >= 2 && item.length <= 42)
    .slice(0, 24);
}

function inferBriefFallback(readableText: string): Partial<TargetRoleBriefData> {
  const lower = readableText.toLowerCase();
  const firstBlock = readableText.slice(0, 2800);

  const requiredBlockMatch =
    readableText.match(/(required qualifications|must have|requirements)[\s\S]{0,1500}/i) ??
    readableText.match(/(任职要求|岗位要求|必备条件)[\s\S]{0,1500}/i);
  const preferredBlockMatch =
    readableText.match(/(preferred qualifications|nice to have|preferred skills)[\s\S]{0,1200}/i) ??
    readableText.match(/(加分项|优先条件|优先技能)[\s\S]{0,1200}/i);

  const topRequiredSkills = requiredBlockMatch
    ? keywordListFromText(requiredBlockMatch[0]).slice(0, 14)
    : keywordListFromText(firstBlock).slice(0, 8);
  const preferredSkills = preferredBlockMatch
    ? keywordListFromText(preferredBlockMatch[0]).slice(0, 12)
    : [];

  const priorities: TargetRoleBriefData["hiringPriorities"] = [];
  if (/(architecture|system design|distributed|scalable|深度|架构|系统设计|分布式)/i.test(lower)) {
    priorities.push("technical_depth");
  }
  if (/(collaborat|communicat|stakeholder|跨团队|沟通|协作)/i.test(lower)) {
    priorities.push("communication");
  }
  if (/(lead|mentor|ownership|带队|负责|主导)/i.test(lower)) {
    priorities.push("leadership");
  }
  if (/(deliver|ship|execute|交付|落地|执行)/i.test(lower)) {
    priorities.push("execution");
  }
  if (/(research|experiment|analysis|研究|实验|分析)/i.test(lower)) {
    priorities.push("research");
  }
  if (/(product|customer|roadmap|业务|产品思维)/i.test(lower)) {
    priorities.push("product_thinking");
  }

  return {
    seniorityLevel:
      /(senior|staff|principal|高级|资深)/i.test(lower)
        ? "Senior"
        : /(intern|graduate|new grad|实习|应届)/i.test(lower)
          ? "Entry"
          : "",
    employmentType:
      /(intern|实习)/i.test(lower)
        ? "Internship"
        : /(contract|合同|外包)/i.test(lower)
          ? "Contract"
          : /(part[- ]?time|兼职)/i.test(lower)
            ? "Part-time"
            : /(full[- ]?time|全职)/i.test(lower)
              ? "Full-time"
              : "",
    workMode:
      /(remote|远程)/i.test(lower)
        ? "Remote"
        : /(hybrid|混合办公)/i.test(lower)
          ? "Hybrid"
          : /(onsite|on-site|现场|到岗)/i.test(lower)
            ? "Onsite"
            : "",
    topRequiredSkills,
    preferredSkills,
    emphasizeKeywords: keywordListFromText(firstBlock).slice(0, 16),
    responsibilitiesSummary: firstBlock.slice(0, 480),
    hiringPriorities: priorities.slice(0, 4),
  };
}

function cleanHtmlToText(html: string) {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(header|footer|nav|aside)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|section|article|li|h1|h2|h3|h4|h5|h6|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const decoded = decodeHtmlEntities(stripped);
  const normalized = decoded
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return normalized.join("\n").slice(0, 18000);
}

async function fetchPostingHtml(url: string) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      "user-agent":
        "ResumeForgeBot/1.0 (+https://resumeforge.app; compatibility job-posting-parser)",
      accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ExternalServiceError(`Unable to fetch job posting URL (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("text/html")) {
    throw new ValidationError("The provided URL is not an HTML job posting page.");
  }

  const html = await response.text();
  if (!html || html.length < 120) {
    throw new ValidationError("Job posting page content is too short to parse.");
  }

  const blockedPatterns = [
    /access denied/i,
    /forbidden/i,
    /verify (you are|you're) human/i,
    /captcha/i,
    /cloudflare/i,
    /bot detection/i,
  ];
  if (blockedPatterns.some((pattern) => pattern.test(html))) {
    throw new ExternalServiceError(
      "This job posting page appears protected by anti-bot checks. Paste the job description text manually.",
    );
  }

  return html;
}

export async function parseJobPostingFromUrl(input: {
  sourceUrl: string;
}): Promise<ExtractedJobPostingOutput> {
  const sourceUrl = ensurePublicUrl(input.sourceUrl.trim());
  const html = await fetchPostingHtml(sourceUrl);
  const jsonLd = extractJsonLdJobPosting(html);
  const readableText = cleanHtmlToText(html);
  const enrichedText = [
    jsonLd?.title ? `Role title: ${jsonLd.title}` : "",
    jsonLd?.company ? `Company: ${jsonLd.company}` : "",
    jsonLd?.location ? `Location: ${jsonLd.location}` : "",
    jsonLd?.description ? `Structured description: ${jsonLd.description}` : "",
    readableText,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (enrichedText.length < 200) {
    throw new ValidationError("Could not extract enough readable text from that URL.");
  }

  logEvent("info", "Parsing job posting URL", {
    sourceUrl,
    textLength: readableText.length,
  });

  const ai = getAIService({ preferLive: true });
  const extracted = await ai.extractJobPosting({
    sourceUrl,
    jobPostingText: enrichedText,
  });
  const inferred = inferBriefFallback(readableText);

  return {
    ...extracted,
    company: extracted.company || jsonLd?.company || "",
    role: extracted.role || jsonLd?.title || "",
    location: extracted.location || jsonLd?.location || "",
    sourceUrl,
    cleanedJobDescription:
      extracted.cleanedJobDescription && extracted.cleanedJobDescription.length >= 120
        ? extracted.cleanedJobDescription
        : (jsonLd?.description || readableText).slice(0, 12000),
    briefData: {
      ...extracted.briefData,
      sourceUrl,
      seniorityLevel: extracted.briefData.seniorityLevel || inferred.seniorityLevel || "",
      employmentType: extracted.briefData.employmentType || inferred.employmentType || "",
      workMode: extracted.briefData.workMode || inferred.workMode || "",
      topRequiredSkills:
        extracted.briefData.topRequiredSkills.length > 0
          ? extracted.briefData.topRequiredSkills
          : inferred.topRequiredSkills ?? [],
      preferredSkills:
        extracted.briefData.preferredSkills.length > 0
          ? extracted.briefData.preferredSkills
          : inferred.preferredSkills ?? [],
      emphasizeKeywords:
        extracted.briefData.emphasizeKeywords.length > 0
          ? extracted.briefData.emphasizeKeywords
          : inferred.emphasizeKeywords ?? [],
      responsibilitiesSummary:
        extracted.briefData.responsibilitiesSummary ||
        inferred.responsibilitiesSummary ||
        "",
      hiringPriorities:
        extracted.briefData.hiringPriorities.length > 0
          ? extracted.briefData.hiringPriorities
          : inferred.hiringPriorities ?? [],
    },
  };
}
