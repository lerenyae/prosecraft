import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { MODELS } from '@/lib/ai-models';

interface FeedbackRequest {
  chapterTitle: string;
  chapterContent: string;
  genre?: string;
  priorChaptersSummary?: string;
}

interface ShowDontTellViolation {
  text: string;
  suggestion: string;
}

interface DevelopmentalFeedback {
  pacing: {
    rating: 'slow' | 'balanced' | 'fast';
    notes: string;
  };
  tension: {
    rating: number;
    arc_description: string;
  };
  dialogue: {
    quality: number;
    issues: string[];
  };
  pov_consistency: {
    consistent: boolean;
    issues: string[];
  };
  show_dont_tell: {
    violations: ShowDontTellViolation[];
  };
  strengths: string[];
  priorities: string[];
}

function stripHtml(html: string): string {
  // Remove script and style tags and their content
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&');

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

function getSystemPrompt(genre?: string): string {
  const genreContext = genre
    ? `You are a developmental editor analyzing a chapter of a ${genre} manuscript.`
    : 'You are a developmental editor analyzing a chapter of a manuscript.';

  return `${genreContext}

Provide structured feedback in valid JSON format with this exact structure:
{
  "pacing": {
    "rating": "slow" | "balanced" | "fast",
    "notes": "specific observations about pacing and scene rhythm"
  },
  "tension": {
    "rating": 1-10,
    "arc_description": "description of the tension arc throughout the chapter"
  },
  "dialogue": {
    "quality": 1-10,
    "issues": ["specific dialogue problems or strengths"]
  },
  "pov_consistency": {
    "consistent": true or false,
    "issues": ["any POV shifts or consistency problems"]
  },
  "show_dont_tell": {
    "violations": [
      {
        "text": "exact quoted text from the chapter",
        "suggestion": "how to rewrite this as showing instead of telling"
      }
    ]
  },
  "strengths": ["list of what works well in this chapter"],
  "priorities": ["top 3 most important things to revise or fix"]
}

Be specific and quote text when flagging issues. Be encouraging but honest in your feedback.`;
}

function buildUserPrompt(
  chapterTitle: string,
  chapterContent: string,
  priorChaptersSummary?: string
): string {
  let prompt = `Chapter Title: "${chapterTitle}"\n\nChapter Content:\n${chapterContent}`;

  if (priorChaptersSummary) {
    prompt = `Prior Chapters Summary:\n${priorChaptersSummary}\n\n${prompt}`;
  }

  prompt += '\n\nPlease provide developmental feedback on this chapter.';

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FeedbackRequest;
    const { chapterTitle, chapterContent, genre, priorChaptersSummary } = body;

    // Validate required fields
    if (!chapterTitle || !chapterContent) {
      return NextResponse.json(
        { error: 'Missing required fields: chapterTitle and chapterContent' },
        { status: 400 }
      );
    }

    // Strip HTML tags from content
    const plainTextContent = stripHtml(chapterContent);

    if (plainTextContent.length === 0) {
      return NextResponse.json(
        { error: 'Chapter content is empty after HTML stripping' },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const systemPrompt = getSystemPrompt(genre);
    const userPrompt = buildUserPrompt(chapterTitle, plainTextContent, priorChaptersSummary);

    const message = await anthropic.messages.create({
      model: MODELS.DEEP,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract the text response
    const responseContent = message.content[0];
    if (responseContent.type !== 'text') {
      return NextResponse.json(
        { error: 'Unexpected response type from API' },
        { status: 500 }
      );
    }

    let feedback: DevelopmentalFeedback;

    try {
      // Remove markdown code blocks if present
      let jsonString = responseContent.text.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.slice(7); // Remove ```json
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.slice(3); // Remove ```
      }
      if (jsonString.endsWith('```')) {
        jsonString = jsonString.slice(0, -3); // Remove trailing ```
      }
      feedback = JSON.parse(jsonString.trim()) as DevelopmentalFeedback;
    } catch (parseError) {
      console.error('Error parsing feedback JSON:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse feedback from AI response' },
        { status: 500 }
      );
    }

    return NextResponse.json(feedback);
  } catch (error) {
    console.error('Error in feedback AI route:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
