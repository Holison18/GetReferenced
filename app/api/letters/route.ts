import { NextRequest, NextResponse } from 'next/server';
import { aiLetterService } from '@/lib/ai-letter-service';
import { getServerUser } from '@/lib/server-auth';
import type { AttributeRatings } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user || user.role !== 'lecturer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId, content, attributeRatings, aiGenerated = true } = await request.json();

    if (!requestId || !content) {
      return NextResponse.json(
        { error: 'Request ID and content are required' },
        { status: 400 }
      );
    }

    await aiLetterService.saveLetter(
      requestId,
      user.id,
      content,
      attributeRatings as AttributeRatings,
      aiGenerated
    );

    return NextResponse.json({ success: true, message: 'Letter saved successfully' });
  } catch (error) {
    console.error('Error saving letter:', error);
    return NextResponse.json(
      { error: 'Failed to save letter' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    const letters = await aiLetterService.getLettersForRequest(requestId);
    return NextResponse.json({ letters });
  } catch (error) {
    console.error('Error fetching letters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch letters' },
      { status: 500 }
    );
  }
}