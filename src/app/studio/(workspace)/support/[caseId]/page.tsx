import { notFound } from "next/navigation";

import { PageHeader, StatusChip } from "@/components/studio/primitives";
import { SupportCaseWorkspace } from "@/components/studio/support-case";
import { getSupportCase } from "@/lib/support/queries";
import { SUPPORT_STATUS_LABEL } from "@/lib/support/types";

export const metadata = { title: "Support case" };

export default async function StudioSupportCasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const detail = await getSupportCase(caseId);
  if (!detail) notFound();

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Support"
        title={detail.subject}
        description={`${detail.caseNumber}${detail.customerEmail ? ` · ${detail.customerEmail}` : ""}`}
        actions={
          <StatusChip
            tone={detail.status === "resolved" ? "success" : "warning"}
          >
            {SUPPORT_STATUS_LABEL[detail.status]}
          </StatusChip>
        }
      />
      <SupportCaseWorkspace detail={detail} />
    </div>
  );
}
