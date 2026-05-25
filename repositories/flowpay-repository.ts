import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { mapBillingCycle, mapCategory, mapInstallment, mapProfile, mapTransaction } from "@/repositories/mappers";
import { transactionSchema } from "@/utils/validation";

export class FlowPayRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async getHouseholdProfiles() {
    const { data, error } = await this.supabase.from("profiles").select("*").order("created_at", { ascending: true }).limit(2);
    if (error) throw error;
    return data.map(mapProfile);
  }

  async getCurrentBillingCycle() {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await this.supabase
      .from("billing_cycles")
      .select("*")
      .lte("start_date", today)
      .gte("end_date", today)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? mapBillingCycle(data) : null;
  }

  async getUpcomingBillingCycle() {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await this.supabase
      .from("billing_cycles")
      .select("*")
      .gt("start_date", today)
      .order("start_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? mapBillingCycle(data) : null;
  }

  async getBillingCycleByDates(startDate: string, endDate: string) {
    const { data, error } = await this.supabase
      .from("billing_cycles")
      .select("*")
      .eq("start_date", startDate)
      .eq("end_date", endDate)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? mapBillingCycle(data) : null;
  }

  async getCategories() {
    const { data, error } = await this.supabase
      .from("categories")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw error;

    const dedupedRows = data.filter((row, index, rows) => {
      const key = `${row.is_default ? "default" : "custom"}:${row.name.toLowerCase()}:${row.created_by_user_id ?? "system"}`;
      return (
        rows.findIndex((candidate) => {
          const candidateKey = `${candidate.is_default ? "default" : "custom"}:${candidate.name.toLowerCase()}:${candidate.created_by_user_id ?? "system"}`;
          return candidateKey === key;
        }) === index
      );
    });

    return dedupedRows.map(mapCategory);
  }

  async getAllBillingCycles() {
    const { data, error } = await this.supabase.from("billing_cycles").select("*").order("start_date", { ascending: false });
    if (error) throw error;
    return data.map(mapBillingCycle);
  }

  async getAllTransactions() {
    const { data, error } = await this.supabase.from("transactions").select("*").order("date", { ascending: false });
    if (error) throw error;
    return data.map(mapTransaction);
  }

  async getTransactionsForCycle(cycleId: string) {
    const { data, error } = await this.supabase
      .from("transactions")
      .select("*")
      .eq("billing_cycle_id", cycleId)
      .order("date", { ascending: false });

    if (error) throw error;
    return data.map(mapTransaction);
  }

  async getActiveInstallments() {
    const { data, error } = await this.supabase.from("installments").select("*").order("start_date", { ascending: true });

    if (error) throw error;
    return data.filter((row) => row.current_installment < row.total_installments).map(mapInstallment);
  }

  async createTransaction(input: unknown) {
    const values = transactionSchema.parse(input);
    const { data, error } = await this.supabase
      .from("transactions")
      .insert({
        billing_cycle_id: values.billingCycleId,
        date: values.date,
        title: values.title,
        category_id: values.categoryId,
        amount: values.amount,
        payer_user_id: values.payerUserId,
        transaction_type: values.transactionType,
        split_type: values.splitType,
        note: values.note ?? null,
        attachment_url: values.attachmentUrl ?? null,
        installment_id: null
      })
      .select()
      .single();

    if (error) throw error;
    return mapTransaction(data);
  }

  async uploadAttachment(path: string, file: File) {
    const { data, error } = await this.supabase.storage.from("attachments").upload(path, file, {
      cacheControl: "3600",
      upsert: false
    });

    if (error) throw error;
    return data.path;
  }
}
