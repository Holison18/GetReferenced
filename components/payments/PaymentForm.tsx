'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Gift } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  requestId: string;
  lecturerIds: string[];
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

interface CheckoutFormProps extends PaymentFormProps {
  clientSecret: string;
  paymentId: string;
  isTokenUsed: boolean;
}

function CheckoutForm({ 
  requestId, 
  clientSecret, 
  paymentId, 
  isTokenUsed, 
  onSuccess, 
  onCancel 
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isTokenUsed) {
      // Token was used, payment is already complete
      onSuccess();
      return;
    }

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: 'Payment Failed',
          description: error.message,
          variant: 'destructive',
        });
      } else if (paymentIntent?.status === 'succeeded') {
        // Confirm payment on server
        const response = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
          }),
        });

        if (response.ok) {
          toast({
            title: 'Payment Successful',
            description: 'Your payment has been processed successfully.',
          });
          onSuccess();
        } else {
          throw new Error('Payment confirmation failed');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Error',
        description: 'An error occurred while processing your payment.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isTokenUsed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-green-600" />
            Free Request Token Applied
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              No Payment Required
            </Badge>
            <p className="text-sm text-muted-foreground mt-2">
              Your token has been applied successfully. You can proceed with your request.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={onCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={onSuccess} className="flex-1">
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement />
          
          <Separator />
          
          <div className="flex gap-2">
            <Button 
              type="button" 
              onClick={onCancel} 
              variant="outline" 
              className="flex-1"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!stripe || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Pay $30.00'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function PaymentForm({
  requestId,
  lecturerIds,
  amount,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentId, setPaymentId] = useState<string>('');
  const [isTokenUsed, setIsTokenUsed] = useState(false);
  const [tokenCode, setTokenCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const { toast } = useToast();

  const createPaymentIntent = async (token?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          lecturerIds,
          tokenCode: token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment creation failed');
      }

      setPaymentId(data.paymentId);
      setClientSecret(data.clientSecret);
      setIsTokenUsed(data.clientSecret === 'token_used');

      if (data.clientSecret === 'token_used') {
        toast({
          title: 'Token Applied',
          description: 'Your free request token has been applied successfully.',
        });
      }
    } catch (error) {
      console.error('Payment creation error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create payment',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenSubmit = () => {
    if (tokenCode.trim()) {
      createPaymentIntent(tokenCode.trim());
    } else {
      createPaymentIntent();
    }
  };

  useEffect(() => {
    createPaymentIntent();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Setting up payment...</span>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-lg font-semibold">Request Total: ${amount.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">
              Payment is required to submit your recommendation letter request
            </p>
          </div>

          {!showTokenInput ? (
            <div className="space-y-2">
              <Button onClick={() => createPaymentIntent()} className="w-full">
                Proceed to Payment
              </Button>
              <Button 
                onClick={() => setShowTokenInput(true)} 
                variant="outline" 
                className="w-full"
              >
                I have a token
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="token">Token Code</Label>
              <Input
                id="token"
                value={tokenCode}
                onChange={(e) => setTokenCode(e.target.value)}
                placeholder="Enter your token code"
              />
              <div className="flex gap-2">
                <Button onClick={() => setShowTokenInput(false)} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={handleTokenSubmit} className="flex-1">
                  Apply Token
                </Button>
              </div>
            </div>
          )}

          <Button onClick={onCancel} variant="ghost" className="w-full">
            Cancel Request
          </Button>
        </CardContent>
      </Card>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <Elements options={options} stripe={stripePromise}>
      <CheckoutForm
        requestId={requestId}
        clientSecret={clientSecret}
        paymentId={paymentId}
        isTokenUsed={isTokenUsed}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}