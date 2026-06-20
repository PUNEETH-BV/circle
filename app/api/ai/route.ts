import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Gemini API Key is missing. Please set GEMINI_API_KEY in your .env.local file to enable AI features.' 
      }, { status: 400 });
    }

    const { action, text, tone } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let prompt = '';

    if (action === 'summarize') {
      prompt = `You are an expert workspace assistant. Summarize the following collaborative document/note text. 
Provide a clear, structured summary containing:
1. A concise overview (1-2 sentences).
2. Bullet points highlighting the key takeaways and actionable items.

Make it clean, readable, and professional. Do not add conversational fluff.

Document text:
"${text}"`;
    } else if (action === 'refine') {
      const tonePrompt = tone === 'inspiring' 
        ? 'engaging, energetic, and highly inspiring' 
        : tone === 'casual' 
          ? 'friendly, warm, and clear' 
          : 'highly professional, clear, and structured';

      prompt = `You are a community manager. Rewrite and polish the following rough announcement text to sound ${tonePrompt} for circle members.
- Keep the core information intact (dates, links, instructions).
- Structure it cleanly using paragraphs or bullet points if helpful.
- Add 1-2 appropriate emojis for readability.
- Return ONLY the final polished text, with no introductory or concluding chat remarks.

Draft announcement text:
"${text}"`;
    } else {
      return NextResponse.json({ error: 'Invalid AI action requested' }, { status: 400 });
    }

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return NextResponse.json({ result: responseText });
  } catch (error: any) {
    console.error('AI API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to communicate with AI model' }, { status: 500 });
  }
}
