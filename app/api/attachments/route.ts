import { NextResponse } from "next/server";
import { createAdminClient } from "@/services/supabase/admin";
import { requireHouseholdApiAccess } from "@/services/flowpay/api-access";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const maxAttachmentBytes = 8 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  const rawBaseName = dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;
  const rawExtension = dotIndex >= 0 ? fileName.slice(dotIndex + 1) : "";
  const baseName = rawBaseName
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const extension = rawExtension.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 10);

  return `${baseName || "attachment"}.${extension || "bin"}`;
}

export async function POST(request: Request) {
  const unauthorized = await requireHouseholdApiAccess();
  if (unauthorized) {
    return unauthorized;
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing attachment file" }, { status: 400 });
  }

  if (!allowedMimeTypes.has(file.type)) {
    return NextResponse.json({ error: "Unsupported attachment type" }, { status: 400 });
  }

  if (file.size > maxAttachmentBytes) {
    return NextResponse.json({ error: "Attachment exceeds 8MB" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const objectPath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const { data, error } = await supabase.storage.from("attachments").upload(objectPath, fileBytes, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false
  });

  if (error || !data?.path) {
    return NextResponse.json({ error: error?.message ?? "Failed to upload attachment" }, { status: 400 });
  }

  return NextResponse.json({
    path: data.path,
    url: `/api/attachments/${data.path.split("/").map(encodeURIComponent).join("/")}`
  });
}
