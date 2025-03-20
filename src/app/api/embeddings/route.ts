import { NextResponse } from 'next/server';
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { texts } = await request.json();

    if (!Array.isArray(texts) || !texts.every(text => typeof text === 'string')) {
      return NextResponse.json(
        { error: 'texts must be an array of strings' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    // Clean and validate input texts
    const validTexts = texts.map(text => text.trim()).filter(text => text.length > 0);
    
    if (validTexts.length === 0) {
      return NextResponse.json(
        { error: 'No valid text provided for embedding' },
        { status: 400 }
      );
    }

    // Generate embeddings
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: validTexts,
      encoding_format: "float",
    });

    const embeddings = response.data.map(item => item.embedding);
    
    return NextResponse.json({ embeddings });
  } catch (error) {
    console.error('Error generating embeddings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate embeddings';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 