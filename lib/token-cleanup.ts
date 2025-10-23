import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function cleanupExpiredTokens(): Promise<{
  success: boolean;
  deletedCount?: number;
  error?: string;
}> {
  try {
    // Get expired tokens that are older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: expiredTokens, error: fetchError } = await supabase
      .from('tokens')
      .select('id, code')
      .lt('expiry_date', thirtyDaysAgo.toISOString().split('T')[0])
      .is('used_by', null);

    if (fetchError) {
      throw new Error(`Failed to fetch expired tokens: ${fetchError.message}`);
    }

    if (!expiredTokens || expiredTokens.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    // Delete expired tokens
    const { error: deleteError } = await supabase
      .from('tokens')
      .delete()
      .in('id', expiredTokens.map(t => t.id));

    if (deleteError) {
      throw new Error(`Failed to delete expired tokens: ${deleteError.message}`);
    }

    // Log the cleanup action
    await supabase
      .from('audit_logs')
      .insert({
        user_id: null, // System action
        action: 'cleanup_expired_tokens',
        resource_type: 'tokens',
        old_values: {
          deleted_tokens: expiredTokens.map(t => ({ id: t.id, code: t.code })),
        },
        new_values: {
          deleted_count: expiredTokens.length,
          cleanup_date: new Date().toISOString(),
        },
      });

    return { success: true, deletedCount: expiredTokens.length };
  } catch (error) {
    console.error('Token cleanup error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function getTokenUsageReport(days: number = 30): Promise<{
  success: boolean;
  report?: {
    totalCreated: number;
    totalUsed: number;
    totalExpired: number;
    totalValueRedeemed: number;
    usageByDay: Array<{
      date: string;
      tokensUsed: number;
      valueRedeemed: number;
    }>;
  };
  error?: string;
}> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all tokens created in the period
    const { data: tokens, error: tokensError } = await supabase
      .from('tokens')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (tokensError) {
      throw new Error(`Failed to fetch tokens: ${tokensError.message}`);
    }

    const now = new Date();
    const totalCreated = tokens?.length || 0;
    const totalUsed = tokens?.filter(t => t.used_by).length || 0;
    const totalExpired = tokens?.filter(t => !t.used_by && new Date(t.expiry_date) < now).length || 0;
    const totalValueRedeemed = tokens?.reduce((sum, t) => sum + (t.used_by ? t.value : 0), 0) || 0;

    // Calculate daily usage
    const usageByDay: Array<{ date: string; tokensUsed: number; valueRedeemed: number }> = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTokens = tokens?.filter(t => 
        t.used_date && t.used_date.startsWith(dateStr)
      ) || [];
      
      usageByDay.push({
        date: dateStr,
        tokensUsed: dayTokens.length,
        valueRedeemed: dayTokens.reduce((sum, t) => sum + t.value, 0),
      });
    }

    return {
      success: true,
      report: {
        totalCreated,
        totalUsed,
        totalExpired,
        totalValueRedeemed,
        usageByDay,
      },
    };
  } catch (error) {
    console.error('Token usage report error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}