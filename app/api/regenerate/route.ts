import { NextRequest, NextResponse } from 'next/server';
import { generateCode } from '@/lib/agent';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const { fileUrl, userQuery, errorMessage } = body;
    
    if (!fileUrl || !userQuery) {
      return NextResponse.json(
        { error: 'Missing required fields: fileUrl and userQuery' },
        { status: 400 }
      );
    }
    
    // Generate code with the error message for feedback
    const code = await generateCode(fileUrl, userQuery, errorMessage, 0);
    
    // Return the generated code
    return NextResponse.json({ code });
  } catch (error) {
    console.error('Error in regenerate API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}