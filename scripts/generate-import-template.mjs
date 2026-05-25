import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

const workbook = XLSX.utils.book_new();

const instructionsRows = [
  ["FlowPay historical import template"],
  [""],
  ["Sheet", "Required", "What to fill"],
  ["BillingCycles", "Yes", "One row per billing cycle. Use YYYY-MM-DD dates. food_wallet_holder should match one of the two household names, such as A or B."],
  ["Transactions", "Yes", "All food, normal, and installment payments. cycle_start_date must match a BillingCycles start_date."],
  ["Installments", "Optional", "Master installment rows for historical installment plans."],
  [""],
  ["Transactions.transaction_type", "", "food | normal | installment"],
  ["Transactions.split_type", "", "split_half | no_split | full_reimburse (food can be left blank)"],
  ["Transactions.category", "", "Food | Transport | Shopping | Bills | Entertainment | Health | Investment | Other"],
  ["Installments.split_type", "", "split_half | no_split | full_reimburse"]
];

const billingRows = [
  ["start_date", "end_date", "food_budget_target", "food_wallet_holder", "carry_over_amount"]
];

const transactionRows = [
  ["date", "title", "amount", "payer", "transaction_type", "split_type", "category", "note", "cycle_start_date", "installment_title", "installment_number"]
];

const installmentRows = [
  ["title", "total_installments", "current_installment", "monthly_amount", "start_date", "end_date", "payer", "split_type"]
];

XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(instructionsRows), "Instructions");
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(billingRows), "BillingCycles");
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(transactionRows), "Transactions");
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(installmentRows), "Installments");

const outputPath = path.join(process.cwd(), "public", "templates", "flowpay-import-template.xlsx");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
XLSX.writeFile(workbook, outputPath);
console.log(outputPath);
