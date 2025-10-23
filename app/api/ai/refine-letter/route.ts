import { NextRequest, NextResponse } from 'next/server';
import { aiLetterService } from '@/lib/ai-letter-service';
import { getServerUser } from '@/lib/server-auth';
import type { GenerationContext } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user || user.role !== 'lecturer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentLetter, feedback, context } = await request.json();

    if (!currentLetter || !feedback || !context) {
      return NextResponse.json(
        { error: 'Current letter, feedback, and context are required' },
        { status: 400 }
      );
    }

    const refinedLetter = await aiLetterService.refineRecommendationLetter(
      user.id,
      currentLetter,
      feedback,
      context as GenerationContext
    );

    return NextResponse.json({ letter: refinedLetter });
  } catch (error) {
    console.error('Error refining letter:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to refine letter' },
      { status: 500 }
    );
  }
}