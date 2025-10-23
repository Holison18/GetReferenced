import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all payments data
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (paymentsError) {
      throw new Error('Failed to fetch payments data');
    }

    // Get all payouts data
    const { data: payouts, error: payoutsError } = await supabase
      .from('payouts')
      .select('*')
      .order('created_at', { ascending: false });

    if (payoutsError) {
      throw new Error('Failed to fetch payouts data');
    }

    // Calculate totals
    const totalRevenue = payments
      .filter(p => p.status === 'succeeded')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const platformRevenue = totalRevenue * 0.25; // 25% platform fee
    const lecturerPayouts = payouts
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalPayments = payments.length;
    const successfulPayments = payments.filter(p => p.status === 'succeeded').length;
    const refundedPayments = payments.filter(p => p.status === 'refunded').length;

    // Calculate monthly data for the last 12 months
    const monthlyData = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthPayments = payments.filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate >= monthStart && paymentDate <= monthEnd && p.status === 'succeeded';
      });

      const monthPayouts = payouts.filter(p => {
        const payoutDate = new Date(p.created_at);
        return payoutDate >= monthStart && payoutDate <= monthEnd && p.status === 'paid';
      });

      monthlyData.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
        payouts: monthPayouts.reduce((sum, p) => sum + Number(p.amount), 0),
        payments: monthPayments.length,
      });
    }

    // Calculate status breakdown
    const statusCounts = payments.reduce((acc, payment) => {
      const status = payment.status;
      if (!acc[status]) {
        acc[status] = { count: 0, amount: 0 };
      }
      acc[status].count++;
      acc[status].amount += Number(payment.amount);
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    const statusBreakdown = Object.entries(statusCounts).map(([status, data]) => ({
      status,
      count: data.count,
      amount: data.amount,
    }));

    return NextResponse.json({
      totalRevenue,
      platformRevenue,
      lecturerPayouts,
      totalPayments,
      successfulPayments,
      refundedPayments,
      monthlyData,
      statusBreakdown,
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue analytics' },
      { status: 500 }
    );
  }
}