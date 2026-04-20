import { getAIService } from "@/lib/ai";
import type { ExtractedJobPostingOutput } from "@/lib/ai/types";
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
    },
  };
}
