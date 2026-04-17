import {
  Document,
  type DocumentProps,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { ResumeVersionRecord } from "@/lib/types";
import { parseResume } from "@/lib/services/resume-parser";

const styles = StyleSheet.create({
  page: {
    paddingTop: 38,
    paddingBottom: 42,
    paddingHorizontal: 42,
    fontSize: 10.5,
    color: "#0f172a",
    fontFamily: "Helvetica",
    lineHeight: 1.45,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.2,
  },
  contact: {
    marginTop: 6,
    fontSize: 9.5,
    color: "#334155",
  },
  summary: {
    marginTop: 12,
    fontSize: 10,
    color: "#334155",
  },
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    paddingBottom: 5,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  line: {
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
    paddingRight: 8,
  },
  bulletGlyph: {
    width: 10,
    fontFamily: "Helvetica-Bold",
  },
  bulletText: {
    flex: 1,
  },
  footer: {
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    fontSize: 8.5,
    color: "#64748b",
  },
});

export function ResumePdfDocument({
  version,
}: {
  version: ResumeVersionRecord;
}): ReactElement<DocumentProps> {
  const parsed = parseResume(version.content);
  const [nameLine, ...generalLines] = parsed.sections.find((section) => section.key === "general")?.lines ?? [];

  return (
    <Document
      author="ResumeForge"
      creator="ResumeForge"
      subject={`${version.name} resume export`}
      title={version.name}
    >
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{nameLine ?? version.name}</Text>
        {parsed.contactLine ? <Text style={styles.contact}>{parsed.contactLine}</Text> : null}
        {version.summary ? <Text style={styles.summary}>{version.summary}</Text> : null}
        {generalLines
          .filter((line) => line !== parsed.contactLine)
          .slice(0, 2)
          .map((line) => (
            <Text key={line} style={styles.summary}>
              {line}
            </Text>
          ))}

        {parsed.sections
          .filter((section) => section.key !== "general")
          .map((section) => {
            const contentLines = section.lines.filter((line) => !/^[-*•]\s*/.test(line));

            return (
              <View key={section.key} style={styles.section}>
                <Text style={styles.sectionHeader}>{section.title}</Text>
                {contentLines.map((line) => (
                  <Text key={`${section.key}_${line}`} style={styles.line}>
                    {line}
                  </Text>
                ))}
                {section.bullets.map((bullet) => (
                  <View key={`${section.key}_${bullet}`} style={styles.bulletRow}>
                    <Text style={styles.bulletGlyph}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            );
          })}

        <Text style={styles.footer}>
          Exported from ResumeForge as a recruiter-ready PDF draft.
        </Text>
      </Page>
    </Document>
  );
}
