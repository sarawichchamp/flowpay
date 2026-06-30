import { z } from "zod";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format");
const uuidSchema = z.string().uuid();
const trimmedTitleSchema = z.string().trim().min(1).max(100);
const amountSchema = z.number().positive().max(10_000_000);
const attachmentPathSchema = z.string().regex(/^\/api\/attachments\/.+$/, "Invalid attachment path");

export const transactionSchema = z.object({
  billingCycleId: uuidSchema,
  date: dateStringSchema,
  title: trimmedTitleSchema,
  categoryId: z.string().trim().min(1).max(120),
  amount: amountSchema,
  payerUserId: uuidSchema,
  transactionType: z.enum(["food", "normal", "installment"]),
  splitType: z.enum(["split_half", "no_split", "full_reimburse"]),
  note: z.string().max(500).optional().nullable(),
  attachmentUrl: attachmentPathSchema.optional().nullable()
});

export const transactionBatchSchema = z.object({
  transactions: z.array(transactionSchema).min(1).max(100)
});

export const transactionUpdateSchema = transactionSchema.extend({
  id: uuidSchema
});

export const deleteByIdSchema = z.object({
  id: uuidSchema
});

export const installmentSchema = z
  .object({
    id: uuidSchema.optional(),
    billingCycleId: uuidSchema,
    title: trimmedTitleSchema,
    totalInstallments: z.number().int().positive().max(360),
    currentInstallment: z.number().int().positive().max(360),
    monthlyAmount: amountSchema,
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    payerUserId: uuidSchema,
    splitType: z.enum(["split_half", "no_split", "full_reimburse"])
  })
  .refine((value) => value.currentInstallment <= value.totalInstallments, {
    message: "Current installment must not exceed total installments",
    path: ["currentInstallment"]
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"]
  });

export const billingCycleCreateSchema = z.object({
  foodBudgetTarget: amountSchema.optional(),
  foodWalletHolderUserId: uuidSchema.optional()
});

export const billingCycleUpdateSchema = z.object({
  id: uuidSchema,
  foodBudgetTarget: amountSchema.optional()
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

export const importHistoryFileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Excel file is empty")
  .refine((file) => file.size <= 12 * 1024 * 1024, "Excel file exceeds 12MB")
  .refine((file) => /\.(xlsx|xlsm|xls)$/i.test(file.name), "Only Excel files are allowed");
