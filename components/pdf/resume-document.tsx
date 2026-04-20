import path from "node:path";
import {
  Document,
  type DocumentProps,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { ResumeRenderModel } from "@/lib/resume-render";

let fontsRegistered = false;

function ensureFonts() {
  if (fontsRegistered) {
    return;
  }

  Font.register({
    family: "ResumeInter",
    src: path.join(
      process.cwd(),
      "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff",
    ),
    fontWeight: 400,
  });
  Font.register({
    family: "ResumeInter",
    src: path.join(
      process.cwd(),
      "node_modules/@fontsource/inter/files/inter-latin-700-normal.woff",
    ),
    fontWeight: 700,
  });
  Font.register({
    family: "ResumeNotoSC",
    src: path.join(
      process.cwd(),
      "node_modules/@fontsource/noto-sans-sc/files/noto-sans-sc-100-400-normal.woff",
    ),
    fontWeight: 400,
  });
  Font.register({
    family: "ResumeNotoSC",
    src: path.join(
      process.cwd(),
      "node_modules/@fontsource/noto-sans-sc/files/noto-sans-sc-100-700-normal.woff",
    ),
    fontWeight: 700,
  });

  fontsRegistered = true;
}

function createStyles(model: ResumeRenderModel) {
  const baseFont = model.language === "zh" ? "ResumeNotoSC" : "ResumeInter";
  const technical = model.templateId === "technical_product";
  const modern = model.templateId === "modern_professional";

  return StyleSheet.create({
    page: {
      paddingTop: 36,
      paddingBottom: 36,
      paddingHorizontal: 38,
      fontSize: 10.5,
      color: "#0f172a",
      fontFamily: baseFont,
      lineHeight: 1.46,
      backgroundColor: "#ffffff",
    },
    header: {
      borderBottomWidth: 1,
      borderBottomColor: modern ? "#93c5fd" : "#cbd5e1",
      paddingBottom: 10,
      marginBottom: 12,
    },
    title: {
      fontSize: 21,
      fontFamily: baseFont,
      fontWeight: 700,
      letterSpacing: 0.2,
    },
    headline: {
      marginTop: 5,
      fontSize: 10,
      color: "#334155",
    },
    contact: {
      marginTop: 4,
      fontSize: 9.2,
      color: "#475569",
    },
    summaryWrap: {
      marginBottom: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#e2e8f0",
    },
    summaryLabel: {
      fontSize: 8.8,
      fontFamily: baseFont,
      fontWeight: 700,
      letterSpacing: 1.1,
      textTransform: model.language === "zh" ? "none" : "uppercase",
      color: "#475569",
    },
    summaryText: {
      marginTop: 6,
      fontSize: 10,
      color: "#334155",
      lineHeight: 1.5,
    },
    content: {
      flexDirection: technical ? "row" : "column",
      gap: 12,
    },
    mainColumn: {
      flexGrow: 1,
      flexBasis: technical ? "68%" : "100%",
    },
    sideColumn: {
      flexGrow: 0,
      flexBasis: "32%",
      paddingLeft: 12,
      borderLeftWidth: 1,
      borderLeftColor: "#e2e8f0",
    },
    section: {
      marginBottom: 11,
    },
    sectionHeader: {
      marginBottom: 6,
      fontSize: 8.8,
      fontFamily: baseFont,
      fontWeight: 700,
      letterSpacing: 1.1,
      textTransform: model.language === "zh" ? "none" : "uppercase",
      color: modern ? "#0c4a6e" : "#334155",
    },
    line: {
      marginBottom: 3,
      fontSize: 9.8,
      color: "#0f172a",
    },
    bulletRow: {
      flexDirection: "row",
      gap: 5,
      marginBottom: 3,
      paddingRight: 6,
    },
    bulletGlyph: {
      width: 8,
      fontFamily: baseFont,
      fontWeight: 700,
      color: modern ? "#0369a1" : "#1f2937",
    },
    bulletText: {
      flex: 1,
      fontSize: 9.8,
      color: "#334155",
    },
    footer: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: "#e2e8f0",
      fontSize: 8.2,
      color: "#64748b",
    },
  });
}

export function ResumePdfDocument({
  model,
  title,
}: {
  model: ResumeRenderModel;
  title: string;
}): ReactElement<DocumentProps> {
  ensureFonts();
  const styles = createStyles(model);
  const technical = model.templateId === "technical_product";
  const sideSections = technical
    ? model.sections.filter((section) =>
        ["skills", "projects", "certifications", "links"].includes(section.key),
      )
    : [];
  const mainSections = technical
    ? model.sections.filter(
        (section) => !["skills", "projects", "certifications", "links"].includes(section.key),
      )
    : model.sections;

  return (
    <Document author="ResumeForge" creator="ResumeForge" subject={title} title={title}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{model.name}</Text>
          {model.headline ? <Text style={styles.headline}>{model.headline}</Text> : null}
          {model.contactLine ? <Text style={styles.contact}>{model.contactLine}</Text> : null}
        </View>

        {model.summary ? (
          <View style={styles.summaryWrap}>
            <Text style={styles.summaryLabel}>
              {model.language === "zh" ? "个人摘要" : "Summary"}
            </Text>
            <Text style={styles.summaryText}>{model.summary}</Text>
          </View>
        ) : null}

        <View style={styles.content}>
          <View style={styles.mainColumn}>
            {mainSections.map((section) => (
              <View key={section.key} style={styles.section}>
                <Text style={styles.sectionHeader}>{section.title}</Text>
                {section.lines.map((line) => (
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
            ))}
          </View>

          {technical ? (
            <View style={styles.sideColumn}>
              {sideSections.map((section) => (
                <View key={section.key} style={styles.section}>
                  <Text style={styles.sectionHeader}>{section.title}</Text>
                  {section.lines.map((line) => (
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
              ))}
            </View>
          ) : null}
        </View>

        <Text style={styles.footer}>{model.footer}</Text>
      </Page>
    </Document>
  );
}
