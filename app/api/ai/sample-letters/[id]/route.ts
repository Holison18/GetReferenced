import { NextRequest, NextResponse } from 'next/server';
import { aiLetterService } from '@/lib/ai-letter-service';
import { getServerUser } from '@/lib/server-auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser();
    if (!user || user.role !== 'lecturer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await aiLetterService.deleteSampleLetter(params.id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sample letter:', error);
    return NextResponse.json(
      { error: 'Failed to delete sample letter' },
      { status: 500 }
    );
  }
}