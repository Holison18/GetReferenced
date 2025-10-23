import { NextRequest, NextResponse } from 'next/server';
import { aiLetterService } from '@/lib/ai-letter-service';
import { getServerUser } from '@/lib/server-auth';
import type { AttributeRatings } from '@/lib/openai';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const letter = await aiLetterService.getLetter(params.id);
    
    // Check if user has access to this letter
    if (user.role === 'lecturer' && letter.lecturer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (user.role === 'student' && letter.request.student_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ letter });
  } catch (error) {
    console.error('Error fetching letter:', error);
    return NextResponse.json(
      { error: 'Failed to fetch letter' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser();
    if (!user || user.role !== 'lecturer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, attributeRatings } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    await aiLetterService.updateLetter(
      params.id,
      content,
      attributeRatings as AttributeRatings
    );

    return NextResponse.json({ success: true, message: 'Letter updated successfully' });
  } catch (error) {
    console.error('Error updating letter:', error);
    return NextResponse.json(
      { error: 'Failed to update letter' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser();
    if (!user || user.role !== 'lecturer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'submit') {
      await aiLetterService.submitLetter(params.id);
      return NextResponse.json({ success: true, message: 'Letter submitted successfully' });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing letter action:', error);
    return NextResponse.json(
      { error: 'Failed to process letter action' },
      { status: 500 }
    );
  }
}