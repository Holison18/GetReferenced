'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  DollarSign, 
  Calendar, 
  Receipt, 
  RefreshCw,
  ExternalLink 
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  receipt_url?: string;
  refund_amount?: number;
  refund_reason?: string;
  requests?: {
    id: string;
    purpose: string;
    status: string;
    deadline: string;
  };
}

interface PayoutRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  paid_date?: string;
  failure_reason?: string;
  payments?: {
    amount: number;
    currency: string;
    requests?: {
      id: string;
      purpose: string;
      student_id: string;
    };
  };
}

interface PaymentHistoryProps {
  userRole: 'student' | 'lecturer';
}

export default function PaymentHistory({ userRole }: PaymentHistoryProps) {
  const [history, setHistory] = useState<(PaymentRecord | PayoutRecord)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/payments/history');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payment history');
      }

      setHistory(data.history || []);
    } catch (error) {
      console.error('Payment history error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment history',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      succeeded: { variant: 'default' as const, label: 'Completed' },
      paid: { variant: 'default' as const, label: 'Paid' },
      pending: { variant: 'secondary' as const, label: 'Pending' },
      processing: { variant: 'secondary' as const, label: 'Processing' },
      failed: { variant: 'destructive' as const, label: 'Failed' },
      cancelled: { variant: 'outline' as const, label: 'Cancelled' },
      refunded: { variant: 'outline' as const, label: 'Refunded' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: 'secondary' as const,
      label: status,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const renderStudentPayment = (payment: PaymentRecord) => (
    <Card key={payment.id}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="font-medium">
                {payment.requests?.purpose || 'Request'} Letter
              </span>
              {getStatusBadge(payment.status)}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                ${payment.amount.toFixed(2)}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(payment.created_at), 'MMM dd, yyyy')}
              </div>
            </div>

            {payment.refund_amount && (
              <div className="text-sm text-orange-600">
                Refunded: ${payment.refund_amount.toFixed(2)}
                {payment.refund_reason && ` (${payment.refund_reason})`}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {payment.receipt_url && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(payment.receipt_url, '_blank')}
              >
                <Receipt className="h-3 w-3 mr-1" />
                Receipt
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderLecturerPayout = (payout: PayoutRecord) => (
    <Card key={payout.id}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="font-medium">
                {payout.payments?.requests?.purpose || 'Letter'} Payout
              </span>
              {getStatusBadge(payout.status)}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                ${payout.amount.toFixed(2)}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(payout.created_at), 'MMM dd, yyyy')}
              </div>
            </div>

            {payout.paid_date && (
              <div className="text-sm text-green-600">
                Paid on {format(new Date(payout.paid_date), 'MMM dd, yyyy')}
              </div>
            )}

            {payout.failure_reason && (
              <div className="text-sm text-red-600">
                Failed: {payout.failure_reason}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading payment history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {userRole === 'student' ? 'Payment History' : 'Payout History'}
          </CardTitle>
          <Button onClick={fetchHistory} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No {userRole === 'student' ? 'payments' : 'payouts'} found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((record) =>
              userRole === 'student'
                ? renderStudentPayment(record as PaymentRecord)
                : renderLecturerPayout(record as PayoutRecord)
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}