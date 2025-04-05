import { NextRequest, NextResponse } from 'next/server';
import { generateCode } from '@/lib/agent';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { fileUrl, userQuery, errorMessage, retryCount = 0 } = body;

    // Validate required fields
    if (!fileUrl || !userQuery) {
      return NextResponse.json(
        { error: "Missing required fields: fileUrl and userQuery are required" },
        { status: 400 }
      );
    }

    // Generate new code with the error message for context
    const regeneratedCode = await generateCode(
      fileUrl,
      userQuery,
      errorMessage,
      retryCount
    );

    // Return the regenerated code
    return NextResponse.json({ code: regeneratedCode });
  } catch (error) {
    console.error("Error in regenerate API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}