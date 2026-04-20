export type UserRole = "USER" | "ADMIN";
export type SubscriptionPlan = "FREE" | "PRO" | "PREMIUM_REVIEW";
export type SubscriptionStatus =
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "INCOMPLETE"
  | "TRIALING";
export type ResumeVersionType = "ORIGINAL" | "TAILORED" | "REWRITE" | "IMPORTED";
export type AIGenerationType = "ANALYSIS" | "BULLET_REWRITE" | "TAILORED_RESUME";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type BillingProvider = "MOCK" | "STRIPE";
export type BillingSessionType = "CHECKOUT" | "PORTAL";
export type BillingSessionStatus = "OPEN" | "COMPLETED" | "EXPIRED" | "FAILED";
export type RewriteMode =
  | "shorter"
  | "more_technical"
  | "leadership_focused"
  | "tailored_to_jd";
export type ResumeIntakeMode = "quick" | "guided";
export type CareerLevel =
  | "student"
  | "student_new_grad"
  | "entry"
  | "entry_level"
  | "internship_candidate"
  | "early_career"
  | "mid"
  | "mid_level"
  | "senior"
  | "staff_plus"
  | "lead_staff"
  | "manager"
  | "director_plus";
export type UILanguage = "en" | "zh";
export type ResumeOutputLanguage = "en" | "zh";
export type ResumeTemplateId =
  | "classic_ats"
  | "modern_professional"
  | "technical_product"
  | "executive_leadership"
  | "minimal_bilingual";

export interface ResumeSection {
  key: string;
  title: string;
  lines: string[];
  bullets: string[];
}

export interface ParsedResume {
  plainText: string;
  contactLine: string;
  sections: ResumeSection[];
  skills: string[];
  experienceBullets: string[];
}

export interface JDAnalysis {
  summary: string;
  seniority: string;
  keywords: string[];
  mustHaves: string[];
}

export interface ScoreCategory {
  label: string;
  score: number;
  note: string;
}

export interface ResumeAnalysis {
  overall: number;
  atsReadiness: number;
  clarity: number;
  impact: number;
  jobFit: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  strengths: string[];
  categories: ScoreCategory[];
}

export interface RewriteResult {
  mode: RewriteMode;
  before: string;
  after: string;
  whyBetter: string[];
  insertedKeywords: string[];
}

export interface TailoredResumeOutput {
  name: string;
  summary: string;
  highlights: string[];
  rewrittenBullets: RewriteResult[];
  content: string;
  score: number;
}

export interface ResumeDraftSection {
  key: string;
  title: string;
  lines: string[];
  bullets: string[];
}

export interface ResumeDraftOutput {
  name: string;
  summary: string;
  sections: ResumeDraftSection[];
  content: string;
  qualityNotes: string[];
}

export interface ResumeWorkExperienceEntry {
  company: string;
  title: string;
  location: string;
  dates: string;
  responsibilities: string;
  achievements: string;
  quantifiedImpact: string;
}

export interface ResumeProfileData {
  mode: ResumeIntakeMode;
  basicProfile: {
    fullName: string;
    currentTitle: string;
    targetTitle: string;
    location: string;
    workAuthorization: string;
    yearsExperience: string;
    careerLevel: CareerLevel | "";
  };
  professionalSummary: string;
  skills: string[];
  workExperiences: ResumeWorkExperienceEntry[];
  education: string[];
  projects: string[];
  certifications: string[];
  awards: string[];
  links: {
    linkedIn: string;
    github: string;
    portfolio: string;
  };
  preferences: {
    resumeStyle: string;
    keywordEmphasis: string;
    industryPreference: string;
    outputLanguage: ResumeOutputLanguage | "";
    templateId: ResumeTemplateId | "";
  };
  notes: string;
}

export interface TargetRoleBriefData {
  sourceUrl: string;
  seniorityLevel: string;
  employmentType: string;
  workMode: string;
  industryDomain: string;
  salaryRange: string;
  topRequiredSkills: string[];
  preferredSkills: string[];
  emphasizeKeywords: string[];
  responsibilitiesSummary: string;
  hiringPriorities: Array<"technical_depth" | "communication" | "leadership" | "execution" | "research" | "product_thinking">;
  atsIntensity: string;
  technicalIntensity: string;
  recruiterNotes: string;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  headline: string;
  targetRole: string;
  location: string;
  role: UserRole;
  createdAt: string;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  provider: BillingProvider;
  priceMonthly: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  entitlements: string[];
  currentPeriodEnd: string | null;
}

export interface ResumeRecord {
  id: string;
  userId: string;
  title: string;
  intakeMode: ResumeIntakeMode;
  originalText: string;
  parsed: ParsedResume;
  profileCompleteness: number;
  profileData: ResumeProfileData | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobDescriptionRecord {
  id: string;
  userId: string;
  company: string;
  role: string;
  location: string;
  description: string;
  keywords: string[];
  briefCompleteness: number;
  briefData: TargetRoleBriefData | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeVersionRecord {
  id: string;
  userId: string;
  resumeId: string;
  jobDescriptionId: string | null;
  name: string;
  type: ResumeVersionType;
  content: string;
  summary: string;
  score: number | null;
  comparisonNotes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AIGenerationRecord {
  id: string;
  userId: string;
  resumeId: string | null;
  jobDescriptionId: string | null;
  resumeVersionId: string | null;
  type: AIGenerationType;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: BillingProvider;
  externalId: string | null;
  createdAt: string;
}

export interface BillingSessionRecord {
  id: string;
  userId: string;
  subscriptionId: string | null;
  provider: BillingProvider;
  type: BillingSessionType;
  status: BillingSessionStatus;
  plan: SubscriptionPlan | null;
  externalId: string | null;
  externalCustomerId: string | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UsageCounterRecord {
  id: string;
  userId: string;
  analysesUsed: number;
  bulletRewritesUsed: number;
  tailoredDraftsUsed: number;
  lastAnalysisAt: string | null;
  lastBulletRewriteAt: string | null;
  lastTailoredDraftAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppSnapshot {
  user: AppUser;
  subscription: SubscriptionRecord | null;
  resumes: ResumeRecord[];
  jobDescriptions: JobDescriptionRecord[];
  resumeVersions: ResumeVersionRecord[];
  aiGenerations: AIGenerationRecord[];
  payments: PaymentRecord[];
  billingSessions: BillingSessionRecord[];
  usage: UsageCounterRecord;
}
