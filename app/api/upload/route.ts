import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest) {
  try {
    
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type and size (max 5MB)
    const validTypes = ["text/csv", "application/vnd.ms-excel"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    // Save to local filesystem
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = join(process.cwd(), "public/uploads");
    const filePath = join(uploadDir, file.name);
    await writeFile(filePath, buffer);

    // Return a local URL
    const url = `/uploads/${file.name}`;
    console.log("File uploaded to:", url); // Debug
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}