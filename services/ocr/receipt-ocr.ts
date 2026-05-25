export type ReceiptOcrDocumentType = "receipt" | "transfer";

export type ReceiptOcrFieldKey =
  | "merchant"
  | "date"
  | "time"
  | "reference"
  | "sourceName"
  | "sourceAccount"
  | "destinationName"
  | "destinationAccount"
  | "fee"
  | "paymentMethod";

export interface ReceiptOcrField {
  key: ReceiptOcrFieldKey;
  value: string;
}

export interface ReceiptOcrLineItem {
  id: string;
  title: string;
  amount: number | null;
  quantity: string;
  sourceLine: string;
  categoryHint: "food" | "other" | null;
}

export interface ReceiptOcrResult {
  documentType: ReceiptOcrDocumentType;
  title: string;
  amount: number | null;
  date: string;
  rawText: string;
  fields: ReceiptOcrField[];
  lineItems: ReceiptOcrLineItem[];
}

const amountPattern = /([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+\.[0-9]{2})/g;
const thaiMonthMap: Record<string, number> = {
  "ม.ค.": 1,
  "ก.พ.": 2,
  "มี.ค.": 3,
  "เม.ย.": 4,
  "พ.ค.": 5,
  "มิ.ย.": 6,
  "ก.ค.": 7,
  "ส.ค.": 8,
  "ก.ย.": 9,
  "กย.": 9,
  "ต.ค.": 10,
  "พ.ย.": 11,
  "ธ.ค.": 12
};

const summaryKeywords = [
  "total",
  "vat",
  "change",
  "fee",
  "ref",
  "reference",
  "trace",
  "batch",
  "tax id",
  "tax invoice",
  "pos id",
  "amount",
  "จำนวนเงิน",
  "ค่าธรรมเนียม",
  "รหัสอ้างอิง",
  "ยอดรวม",
  "รวม",
  "ยอดสุทธิ",
  "ชำระ",
  "payment",
  "wallet",
  "true money"
];

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeLookup(value: string) {
  return normalizeText(value).toLowerCase();
}

function getCleanLines(text: string) {
  return text
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map(normalizeText)
    .filter(Boolean);
}

function extractAmounts(line: string) {
  return Array.from(line.matchAll(amountPattern))
    .map((match) => Number(match[1].replace(/,/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function extractAmount(text: string) {
  const values = getCleanLines(text).flatMap(extractAmounts);
  return values.length ? Math.max(...values) : null;
}

function parseThaiDate(line: string) {
  const match = line.match(/(\d{1,2})\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|กย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*(\d{2,4})/);
  if (!match) return "";

  const day = Number(match[1]);
  const month = thaiMonthMap[match[2]];
  let year = Number(match[3]);

  if (!month || !Number.isFinite(day) || !Number.isFinite(year)) return "";

  if (year < 100) {
    year = 2500 + year;
  }

  if (year > 2400) {
    year -= 543;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseIsoDate(line: string) {
  const direct = line.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (direct) {
    return `${direct[1]}-${direct[2]}-${direct[3]}`;
  }

  const dayFirst = line.match(/\b(\d{2})[/-](\d{2})[/-](\d{4})\b/);
  if (dayFirst) {
    return `${dayFirst[3]}-${dayFirst[2]}-${dayFirst[1]}`;
  }

  return "";
}

function parseDate(lines: string[]) {
  for (const line of lines) {
    const thaiDate = parseThaiDate(line);
    if (thaiDate) return thaiDate;

    const isoDate = parseIsoDate(line);
    if (isoDate) return isoDate;
  }

  return "";
}

function parseTime(lines: string[]) {
  for (const line of lines) {
    const match = line.match(/\b(\d{1,2}:\d{2})\b/);
    if (match) return match[1];
  }

  return "";
}

function isUsefulTextLine(line: string) {
  return /[A-Za-z\u0E00-\u0E7F]/.test(line) && !/^\d[\d\s./:-]*$/.test(line);
}

function isMetadataLine(line: string) {
  const normalized = normalizeLookup(line);
  return summaryKeywords.some((keyword) => normalized.includes(keyword));
}

function cleanTitleCandidate(line: string) {
  return normalizeText(
    line
      .replace(/\(\d{6,,}\)\w*/g, "")
      .replace(/\(?\d{6,}\)?\w*/g, "")
      .replace(/\b\d+(?:\.\d+)?\s*[*xX]\s*\d+(?:,\d{3})*(?:\.\d{2})?\b/g, "")
      .replace(amountPattern, "")
      .replace(/[():]/g, " ")
  );
}

function getFirstUsefulLine(lines: string[]) {
  return (
    lines.find(
      (line) =>
        isUsefulTextLine(line) &&
        !isMetadataLine(line) &&
        !["ttb", "scb"].includes(normalizeLookup(line))
    ) ?? ""
  );
}

function extractReference(lines: string[]) {
  for (const line of lines) {
    const match = line.match(/(?:รหัสอ้างอิง|ref(?:erence)?(?: no)?|trace|batch)\s*[:：]?\s*([A-Za-z0-9-]{6,})/i);
    if (match) return match[1];
  }

  return "";
}

function extractFee(lines: string[]) {
  for (const line of lines) {
    if (!/(fee|ค่าธรรมเนียม)/i.test(line)) continue;
    const amounts = extractAmounts(line);
    if (amounts.length) return amounts[amounts.length - 1].toFixed(2);
  }

  return "";
}

function extractAccount(line: string) {
  const match = line.match(/([xX*]{2,}[-\dA-Za-z]+|\d{3,}[-\dA-Za-z]*)/);
  return match?.[1] ?? "";
}

function findBlockValue(lines: string[], keyword: RegExp) {
  const index = lines.findIndex((line) => keyword.test(normalizeLookup(line)));
  if (index === -1) return { name: "", account: "" };

  const name = lines.slice(index + 1, index + 4).find((line) => isUsefulTextLine(line) && !extractAccount(line)) ?? "";
  const account = lines.slice(index + 1, index + 4).map(extractAccount).find(Boolean) ?? "";
  return { name, account };
}

function inferDocumentType(lines: string[]) {
  const normalized = lines.map(normalizeLookup);
  const signals = [
    normalized.some((line) => line.includes("จ่ายบิลสำเร็จ") || line.includes("เติมเงินสำเร็จ") || line.includes("successful")),
    normalized.some((line) => line === "จาก" || line.includes("from")),
    normalized.some((line) => line === "ไปยัง" || line.includes("to")),
    normalized.some((line) => line.includes("รหัสอ้างอิง") || line.includes("reference") || line.includes("trace")),
    normalized.some((line) => line.includes("บัญชี") || line.includes("wallet") || line.includes("card"))
  ].filter(Boolean).length;

  return signals >= 2 ? "transfer" : "receipt";
}

function inferCategoryHint(title: string, documentType: ReceiptOcrDocumentType) {
  if (documentType === "transfer") return "other" as const;

  const normalized = normalizeLookup(title);
  if (
    [
      "น้ำ",
      "ข้าว",
      "ผัก",
      "ผลไม้",
      "หมู",
      "ไก่",
      "ปลา",
      "ไข่",
      "ขนม",
      "lemon",
      "banana",
      "rice",
      "milk",
      "water"
    ].some((keyword) => normalized.includes(keyword))
  ) {
    return "food" as const;
  }

  return "food" as const;
}

function buildReceiptLineItems(lines: string[]) {
  const lineItems: ReceiptOcrLineItem[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const normalized = normalizeLookup(line);
    const amounts = extractAmounts(line);

    if (!amounts.length) continue;
    if (summaryKeywords.some((keyword) => normalized.includes(keyword))) continue;

    const inlineTitle = cleanTitleCandidate(line);
    const previousTitle =
      [lines[index - 1], lines[index - 2]]
        .filter(Boolean)
        .map(cleanTitleCandidate)
        .find((candidate) => candidate && isUsefulTextLine(candidate) && !isMetadataLine(candidate)) ?? "";

    const title = inlineTitle && isUsefulTextLine(inlineTitle) ? inlineTitle : previousTitle;
    if (!title) continue;

    const amount = amounts[amounts.length - 1] ?? null;
    const quantityMatch = line.match(/(\d+(?:\.\d+)?)\s*[*xX]/);
    const key = `${normalizeLookup(title)}|${amount ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    lineItems.push({
      id: crypto.randomUUID(),
      title,
      amount,
      quantity: quantityMatch?.[1] ?? "",
      sourceLine: line,
      categoryHint: inferCategoryHint(title, "receipt")
    });
  }

  return lineItems;
}

function buildTransferLineItems(title: string, amount: number | null) {
  return [
    {
      id: crypto.randomUUID(),
      title: title || "Transfer",
      amount,
      quantity: "",
      sourceLine: title || "Transfer",
      categoryHint: "other" as const
    }
  ];
}

function buildFields(lines: string[], documentType: ReceiptOcrDocumentType) {
  const fields: ReceiptOcrField[] = [];
  const date = parseDate(lines);
  const time = parseTime(lines);
  const reference = extractReference(lines);
  const fee = extractFee(lines);

  if (documentType === "transfer") {
    const source = findBlockValue(lines, /^(จาก|from)$/i);
    const destination = findBlockValue(lines, /^(ไปยัง|to)$/i);
    const paymentMethod = getFirstUsefulLine(lines.filter((line) => /wallet|card|บัตร/i.test(line)));

    fields.push(
      { key: "sourceName", value: source.name },
      { key: "sourceAccount", value: source.account },
      { key: "destinationName", value: destination.name },
      { key: "destinationAccount", value: destination.account },
      { key: "paymentMethod", value: paymentMethod }
    );
  } else {
    fields.push({ key: "merchant", value: getFirstUsefulLine(lines) });
  }

  fields.push(
    { key: "date", value: date },
    { key: "time", value: time },
    { key: "reference", value: reference },
    { key: "fee", value: fee }
  );

  return fields.filter((field) => field.value);
}

function buildTitle(documentType: ReceiptOcrDocumentType, fields: ReceiptOcrField[], lines: string[]) {
  const fieldMap = new Map(fields.map((field) => [field.key, field.value]));

  if (documentType === "transfer") {
    return fieldMap.get("destinationName") || fieldMap.get("paymentMethod") || getFirstUsefulLine(lines) || "Transfer";
  }

  return fieldMap.get("merchant") || getFirstUsefulLine(lines) || "Receipt";
}

export async function runReceiptOcr(file: File): Promise<ReceiptOcrResult> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng+tha");

  try {
    const {
      data: { text }
    } = await worker.recognize(file);

    const lines = getCleanLines(text);
    const documentType = inferDocumentType(lines);
    const fields = buildFields(lines, documentType);
    const title = buildTitle(documentType, fields, lines);
    const amount = extractAmount(text);
    const date = parseDate(lines);
    const lineItems =
      documentType === "receipt"
        ? buildReceiptLineItems(lines)
        : buildTransferLineItems(title, amount);

    return {
      documentType,
      title,
      amount,
      date,
      rawText: text,
      fields,
      lineItems
    };
  } finally {
    await worker.terminate();
  }
}
