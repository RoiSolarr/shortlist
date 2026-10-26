import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callN8n } from "@/lib/n8n";

export const maxDuration = 90;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Body: { resume_id, file_name }
 * The browser has already uploaded the PDF to resumes/<user id>/<resume id>.pdf.
 * This creates the resume row, asks n8n to extract the text, and n8n makes it active.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const resumeId = typeof body.resume_id === "string" && UUID.test(body.resume_id) ? body.resume_id : null;
  const fileName = typeof body.file_name === "string" ? body.file_name.slice(0, 200) : "resume.pdf";
  if (!resumeId) return NextResponse.json({ error: "Invalid file." }, { status: 400 });

  const filePath = `${user.id}/${resumeId}.pdf`;
  const label = fileName.replace(/\.pdf$/i, "").trim().slice(0, 80) || "Uploaded resume";

  const { error: insertError } = await supabase.from("resumes").insert({
    id: resumeId,
    user_id: user.id,
    label,
    file_path: filePath,
    file_name: fileName,
    extraction_status: "processing",
    is_active: false,
  });
  if (insertError) {
    console.error("Resume insert failed:", insertError);
    await supabase.storage.from("resumes").remove([filePath]);
    return NextResponse.json({ error: "Could not save the resume." }, { status: 500 });
  }

  async function cleanUp() {
    await supabase.from("resumes").delete().eq("id", resumeId);
    await supabase.storage.from("resumes").remove([filePath]);
  }

  // Short lived link so n8n can download the private file without any storage key
  const { data: signed, error: signError } = await supabase.storage.from("resumes").createSignedUrl(filePath, 300);
  if (signError || !signed?.signedUrl) {
    await cleanUp();
    return NextResponse.json({ error: "Could not prepare the file for reading." }, { status: 500 });
  }

  const result = await callN8n<{ ok: boolean; characters: number }>(
    process.env.N8N_RESUME_WEBHOOK_URL,
    { user_id: user.id, resume_id: resumeId, file_url: signed.signedUrl },
    90_000,
  );

  if (!result.ok) {
    await cleanUp();
    return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
  }

  const { data: resumes } = await supabase
    .from("resumes")
    .select("*")
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });
  return NextResponse.json({ resumes: resumes ?? [], resume_id: resumeId });
}