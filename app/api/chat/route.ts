// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateCode } from "@/lib/agent";

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
      console.log("Raw request body:", body); // Debug
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { messages } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      console.error("Messages validation failed:", messages);
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    console.log("Chat request messages:", messages);
    const userMessage = messages[messages.length - 1]?.content;
    if (!userMessage || typeof userMessage !== "string") {
      console.error("Invalid message content:", messages[messages.length - 1]);
      return NextResponse.json({ error: "Invalid message content" }, { status: 400 });
    }

    const fileUrlMatch = userMessage.match(/User uploaded a file: (.*)/);
    if (fileUrlMatch) {
      const fileUrl = fileUrlMatch[1];
      return NextResponse.json({
        role: "assistant",
        content: `File received at ${fileUrl}. Ask a question about it!`,
      });
    }

    const fileUrl = messages
      .map((m: any) => m.content?.match(/User uploaded a file: (.*)/)?.[1])
      .filter(Boolean)[0];

    if (!fileUrl) {
      return NextResponse.json({
        role: "assistant",
        content: "Please upload a file first or ask a specific question about the data.",
      });
    }

    const code = await generateCode(fileUrl, userMessage);
    return NextResponse.json({
      role: "assistant",
      content: code,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: `Chat failed: ` }, { status: 500 });
  }
}