import { NextRequest, NextResponse } from 'next/server';
import { aiLetterService } from '@/lib/ai-letter-service';
import { getServerUser } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user || user.role !== 'lecturer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sampleLetters = await aiLetterService.getSampleLetters(user.id);
    return NextResponse.json({ sampleLetters });
  } catch (error) {
    console.error('Error fetching sample letters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sample letters' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user || user.role !== 'lecturer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, content, category, fileUrl } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const sampleLetter = await aiLetterService.uploadSampleLetter(
      user.id,
      title,
      content,
      category,
      fileUrl
    );

    return NextResponse.json({ sampleLetter });
  } catch (error) {
    console.error('Error uploading sample letter:', error);
    return NextResponse.json(
      { error: 'Failed to upload sample letter' },
      { status: 500 }
    );
  }
}