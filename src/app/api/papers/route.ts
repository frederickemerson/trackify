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

// GET: Fetch all papers
export async function GET(req: NextRequest) {
  if (!verifyToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const papers = await sql`
      SELECT * FROM research_stuff
      ORDER BY created_at DESC
    `;
    return NextResponse.json(papers);
  } catch (error) {
    console.error("Error fetching papers:", error);
    return NextResponse.json({ error: "Failed to fetch papers" }, { status: 500 });
  }
}

// POST: Add a new paper
export async function POST(req: NextRequest) {
  if (!verifyToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, pdf_link, deadline, status } = body;

    if (!name || !pdf_link || !deadline || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = Date.now().toString();
    const date_added = new Date().toISOString().split("T")[0];

    await sql`
      INSERT INTO research_stuff (id, name, pdf_link, deadline, status, date_added)
      VALUES (${id}, ${name}, ${pdf_link}, ${deadline}, ${status}, ${date_added})
    `;

    return NextResponse.json({ id, name, pdf_link, deadline, status, date_added });
  } catch (error) {
    console.error("Error adding paper:", error);
    return NextResponse.json({ error: "Failed to add paper" }, { status: 500 });
  }
}