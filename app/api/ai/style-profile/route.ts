import { NextRequest, NextResponse } from 'next/server';
import { aiLetterService } from '@/lib/ai-letter-service';
import { getServerUser } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user || user.role !== 'lecturer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const styleProfile = await aiLetterService.getStyleProfile(user.id);
    return NextResponse.json({ styleProfile });
  } catch (error) {
    console.error('Error fetching style profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch style profile' },
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

    const styleProfile = await aiLetterService.updateStyleProfile(user.id);
    return NextResponse.json({ styleProfile });
  } catch (error) {
    console.error('Error updating style profile:', error);
    return NextResponse.json(
      { error: 'Failed to update style profile' },
      { status: 500 }
    );
  }
}