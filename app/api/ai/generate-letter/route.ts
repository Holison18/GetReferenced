import { NextRequest, NextResponse } from 'next/server';
import { aiLetterService } from '@/lib/ai-letter-service';
import { getServerUser } from '@/lib/server-auth';
import type { AttributeRatings, GenerationContext } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user || user.role !== 'lecturer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { context, attributeRatings } = await request.json();

    if (!context || !attributeRatings) {
      return NextResponse.json(
        { error: 'Context and attribute ratings are required' },
        { status: 400 }
      );
    }

    const generatedLetter = await aiLetterService.generateRecommendationLetter(
      user.id,
      context as GenerationContext,
      attributeRatings as AttributeRatings
    );

    return NextResponse.json({ letter: generatedLetter });
  } catch (error) {
    console.error('Error generating letter:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate letter' },
      { status: 500 }
    );
  }
}