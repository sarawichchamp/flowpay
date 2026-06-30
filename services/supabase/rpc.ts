type SupabaseRpcError = {
  code?: string;
  message?: string;
};

export function isMissingRpcFunction(error: SupabaseRpcError | null | undefined) {
  if (!error) return false;

  return error.code === "PGRST202" || error.message?.includes("Could not find the function") || false;
}
