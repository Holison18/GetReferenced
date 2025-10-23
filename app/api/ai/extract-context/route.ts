import { NextRequest, NextResponse } from 'next/server';
import { aiLetterService } from '@/lib/ai-letter-service';
import { getServerUser } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user || user.role !== 'lecturer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentText } = await request.json();

    if (!documentText) {
      return NextResponse.json(
        { error: 'Document text is required' },
        { status: 400 }
      );
    }

    const context = await aiLetterService.extractStudentContext(documentText);
    return NextResponse.json({ context });
  } catch (error) {
    console.error('Error extracting context:', error);
    return NextResponse.json(
      { error: 'Failed to extract document context' },
      { status: 500 }
    );
  }
}