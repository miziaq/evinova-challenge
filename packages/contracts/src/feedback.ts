import { z } from "zod";

export const ProcessingStateSchema = z.enum([
  "pending",
  "processing",
  "succeeded",
  "failed",
]);
export type ProcessingState = z.infer<typeof ProcessingStateSchema>;

export const CategorySchema = z.enum([
  "bug",
  "feature_request",
  "praise",
  "other",
]);
export type Category = z.infer<typeof CategorySchema>;

export const SentimentSchema = z.enum(["positive", "neutral", "negative"]);
export type Sentiment = z.infer<typeof SentimentSchema>;

export const SeveritySchema = z.enum(["low", "medium", "high"]);
export type Severity = z.infer<typeof SeveritySchema>;

// The structured output contract the AI model must satisfy.
export const FeedbackContentSchema = z.object({
  category: CategorySchema,
  sentiment: SentimentSchema,
  severity: SeveritySchema,
  summary: z.string(),
  suggestedAction: z.string(),
});
export type FeedbackContent = z.infer<typeof FeedbackContentSchema>;

// Request body for submitting new feedback.
export const SubmitFeedbackRequestSchema = z.object({
  text: z.string().min(15),
});
export type SubmitFeedbackRequest = z.infer<typeof SubmitFeedbackRequestSchema>;

// Shape of a record immediately after submission, before AI processing
// fields are populated.
export const PendingFeedbackRecordSchema = z.object({
  id: z.string().uuid(),
  submittedAt: z.string().datetime(),
  originalText: z.string().min(15).max(1000),
  processingState: ProcessingStateSchema,
  retries: z.number().int().min(0),
  lastAttemptAt: z.string().datetime().nullable(),
});
export type PendingFeedbackRecord = z.infer<
  typeof PendingFeedbackRecordSchema
>;

// Full record shape once AI processing has (at least once) run, merging
// the pending fields with the AI-derived content fields.
export const FeedbackRecordSchema = PendingFeedbackRecordSchema.extend({
  category: CategorySchema.nullable(),
  sentiment: SentimentSchema.nullable(),
  severity: SeveritySchema.nullable(),
  summary: z.string().nullable(),
  suggestedAction: z.string().nullable(),
});
export type FeedbackRecord = z.infer<typeof FeedbackRecordSchema>;
