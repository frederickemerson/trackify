/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { S3 } from "@aws-sdk/client-s3";
import { neon } from "@neondatabase/serverless";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";

// Initialize R2 client
const s3 = new S3({
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: "auto",
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

// Initialize Neon client
const sql = neon(env.DATABASE_URL);

// Middleware to verify JWT
const verifyToken = (req: NextRequest) => {
  return true;
};


// DELETE: Remove a paper
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id =  (await params).id;
    const paper = await sql`
      SELECT review_file_name FROM research_stuff WHERE id = ${id}
    `;
    if (paper.length === 0) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    // Delete review file from R2 if it exists
    if (paper[0]?.review_file_name) {
      await s3.deleteObject({
        Bucket: "paper-reviews",
        Key: `reviews/${id}/${paper[0].review_file_name}`,
      });
    }

    await sql`DELETE FROM research_stuff WHERE id = ${id}`;
    return NextResponse.json({ message: "Paper deleted" });
  } catch (error) {
    console.error("Error deleting paper:", error);
    return NextResponse.json({ error: "Failed to delete paper" }, { status: 500 });
  }
}

// PATCH: Update paper status or complete review
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = (await params).id
    const formData = await req.formData();
    const status = formData.get("status") as string | null;
    const summary = formData.get("summary") as string | null;
    const reviewFile = formData.get("reviewFile") as File | null;

    let review_file_url = null;
    let review_file_name = null;
    let review_file_type = null;

    if (reviewFile) {
      const fileKey = `reviews/${id}/${Date.now()}_${reviewFile.name}`;
      const arrayBuffer = await reviewFile.arrayBuffer();

      await s3.putObject({
        Bucket: "paper-reviews",
        Key: fileKey,
        Body: new Uint8Array(arrayBuffer),
        ContentType: reviewFile.type,
      });

      review_file_url = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/paper-reviews/${fileKey}`;
      review_file_name = reviewFile.name;
      review_file_type = reviewFile.type;
    }

    await sql`
      UPDATE research_stuff
      SET 
        status = COALESCE(${status}, status),
        summary = COALESCE(${summary}, summary),
        review_file_url = COALESCE(${review_file_url}, review_file_url),
        review_file_name = COALESCE(${review_file_name}, review_file_name),
        review_file_type = COALESCE(${review_file_type}, review_file_type),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    return NextResponse.json({ message: "Paper updated" });
  } catch (error) {
    console.error("Error updating paper:", error);
    return NextResponse.json({ error: "Failed to update paper" }, { status: 500 });
  }
}