import { SettlementDetailPage } from "@/features/settlement/settlement-detail-page";

export default async function Page({
  params
}: {
  params: Promise<{ cycleStart: string }>;
}) {
  const { cycleStart } = await params;
  return <SettlementDetailPage cycleStart={decodeURIComponent(cycleStart)} />;
}
