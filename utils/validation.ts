import { z } from "zod";

export const transactionSchema = z.object({
  billingCycleId: z.string().uuid(),
  date: z.string().date(),
  title: z.string().min(1).max(100),
  categoryId: z.string().uuid(),
  amount: z.number().positive().max(10_000_000),
  payerUserId: z.string().uuid(),
  transactionType: z.enum(["food", "normal", "installment"]),
  splitType: z.enum(["split_half", "no_split", "full_reimburse"]),
  note: z.string().max(500).optional().nullable(),
  attachmentUrl: z.string().url().optional().nullable()
});

export const receiptFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= 8 * 1024 * 1024, "Maximum file size is 8MB")
  .refine((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type), "Only JPG, PNG, and WebP are allowed");

export const transactionAttachmentFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= 8 * 1024 * 1024, "Maximum file size is 8MB")
  .refine(
    (file) => ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type),
    "Only JPG, PNG, WebP, and PDF are allowed"
  );
