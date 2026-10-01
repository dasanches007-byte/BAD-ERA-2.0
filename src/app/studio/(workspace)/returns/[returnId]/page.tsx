import { notFound } from "next/navigation";

import { PageHeader, StatusChip } from "@/components/studio/primitives";
import { ReturnWorkspace } from "@/components/studio/return-workspace";
import { getReturn } from "@/lib/returns/queries";
import { RETURN_STATUS_LABEL } from "@/lib/returns/types";

export const metadata = { title: "Return" };

export default async function StudioReturnDetailPage({
  params,
}: {
  params: Promise<{ returnId: string }>;
}) {
  const { returnId } = await params;
  const detail = await getReturn(returnId);
  if (!detail) notFound();

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Return"
        title={detail.returnNumber}
        description={`${detail.customerEmail} · order ${detail.orderNumber}`}
        actions={
          <StatusChip
            tone={
              detail.status === "rejected"
                ? "critical"
                : detail.status === "received"
                  ? "success"
                  : "warning"
            }
          >
            {RETURN_STATUS_LABEL[detail.status]}
          </StatusChip>
        }
      />
      <ReturnWorkspace detail={detail} />
    </div>
  );
}
