'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  DollarSign 
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface PayoutStatus {
  isSetup: boolean;
  canReceivePayouts: boolean;
  accountId?: string;
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
}

export default function PayoutSetup() {
  const [status, setStatus] = useState<PayoutStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const { toast } = useToast();

  const fetchPayoutStatus = async () => {
    try {
      const response = await fetch('/api/payments/payout-status');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payout status');
      }

      setStatus(data);
    } catch (error) {
      console.error('Payout status error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payout status',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupPayout = async () => {
    setIsSettingUp(true);
    try {
      const response = await fetch('/api/payments/setup-payout', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to setup payout');
      }

      // Redirect to Stripe onboarding
      window.location.href = data.onboardingUrl;
    } catch (error) {
      console.error('Payout setup error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to setup payout',
        variant: 'destructive',
      });
      setIsSettingUp(false);
    }
  };

  useEffect(() => {
    fetchPayoutStatus();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading payout status...</span>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Payout Setup Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Unable to load payout status. Please try again later.
          </p>
          <Button onClick={fetchPayoutStatus} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Payout Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">Account Status</span>
          {status.canReceivePayouts ? (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ready for Payouts
            </Badge>
          ) : status.isSetup ? (
            <Badge variant="secondary">
              <AlertCircle className="h-3 w-3 mr-1" />
              Setup Incomplete
            </Badge>
          ) : (
            <Badge variant="outline">
              <AlertCircle className="h-3 w-3 mr-1" />
              Not Setup
            </Badge>
          )}
        </div>

        {!status.isSetup && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need to complete your payout setup to receive payments for completed letters.
              This is a one-time setup process with Stripe.
            </AlertDescription>
          </Alert>
        )}

        {status.isSetup && !status.canReceivePayouts && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your payout account needs additional information before you can receive payments.
              Please complete the required steps.
            </AlertDescription>
          </Alert>
        )}

        {status.canReceivePayouts && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Your payout account is fully setup! You'll automatically receive 75% of each payment
              when you complete and submit a recommendation letter.
            </AlertDescription>
          </Alert>
        )}

        {status.requirements && (
          <div className="space-y-2">
            {status.requirements.currently_due.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-600">Required Now:</p>
                <ul className="text-sm text-red-600 list-disc list-inside">
                  {status.requirements.currently_due.map((req, index) => (
                    <li key={index}>{req.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {status.requirements.eventually_due.length > 0 && (
              <div>
                <p className="text-sm font-medium text-orange-600">Required Later:</p>
                <ul className="text-sm text-orange-600 list-disc list-inside">
                  {status.requirements.eventually_due.map((req, index) => (
                    <li key={index}>{req.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="pt-4">
          {!status.isSetup ? (
            <Button 
              onClick={setupPayout} 
              disabled={isSettingUp}
              className="w-full"
            >
              {isSettingUp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Setup Payout Account
                </>
              )}
            </Button>
          ) : !status.canReceivePayouts ? (
            <Button 
              onClick={setupPayout} 
              disabled={isSettingUp}
              variant="outline"
              className="w-full"
            >
              {isSettingUp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Complete Setup
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={fetchPayoutStatus} 
              variant="outline"
              className="w-full"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Refresh Status
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <p>• You'll receive 75% of each $30 payment ($22.50)</p>
          <p>• Payouts are processed automatically when letters are completed</p>
          <p>• Funds typically arrive in 2-7 business days</p>
        </div>
      </CardContent>
    </Card>
  );
}