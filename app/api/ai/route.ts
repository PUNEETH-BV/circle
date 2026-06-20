import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const { action, text, tone } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

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

    let responseText = '';

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        responseText = result.response.text();
      } catch (err: any) {
        console.warn('Gemini API call failed, using mock fallback:', err.message);
        responseText = getMockFallback(action, text, tone);
      }
    } else {
      console.warn('Gemini API key missing, using mock fallback.');
      responseText = getMockFallback(action, text, tone);
    }

    return NextResponse.json({ result: responseText });
  } catch (error: any) {
    console.error('AI API Route Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process AI action' }, { status: 500 });
  }
}

function getMockFallback(action: string, text: string, tone?: string) {
  if (action === 'summarize') {
    const sentences = text
      .replace(/<[^>]*>/g, '') // strip simple HTML tags
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(Boolean);

    const overview = sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '.' : '');
    const points = sentences.slice(2, 6).map(s => `- ${s}`).join('\n');

    return `✨ [AI Fallback Summary]\n\n${overview || 'A brief collaborative document note.'}\n\nKey Takeaways:\n${points || '- Review document details inside the workspace.\n- Make edits and save versions.'}\n\n*Note: Gemini API is currently offline or unconfigured, resilient fallback summary shown.*`;
  } else {
    const emojiMap: Record<string, string> = {
      inspiring: '🚀✨',
      casual: '👋😊',
      professional: '👔📋',
    };
    const emoji = emojiMap[tone || 'professional'] || '📢';
    return `${emoji} [AI Refined Post - ${tone || 'Professional'}]\n\n${text}\n\n*Note: Gemini API is currently offline or unconfigured, fallback styling applied.*`;
  }
}
