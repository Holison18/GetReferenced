'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Gift, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Calendar,
  DollarSign 
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

interface ValidatedToken {
  id: string;
  code: string;
  value: number;
  expiryDate: string;
}

interface TokenValidatorProps {
  onTokenValidated?: (token: ValidatedToken) => void;
  onTokenCleared?: () => void;
  initialCode?: string;
}

export default function TokenValidator({ 
  onTokenValidated, 
  onTokenCleared,
  initialCode = '' 
}: TokenValidatorProps) {
  const [code, setCode] = useState(initialCode);
  const [validatedToken, setValidatedToken] = useState<ValidatedToken | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string>('');
  const { toast } = useToast();

  const validateToken = async () => {
    if (!code.trim()) {
      setError('Please enter a token code');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const response = await fetch('/api/tokens/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Token validation failed');
      }

      if (data.valid) {
        setValidatedToken(data.token);
        onTokenValidated?.(data.token);
        toast({
          title: 'Token Valid',
          description: `Token provides ${data.token.value} free request${data.token.value > 1 ? 's' : ''}`,
        });
      } else {
        throw new Error(data.error || 'Invalid token');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token validation failed';
      setError(errorMessage);
      toast({
        title: 'Invalid Token',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const clearToken = () => {
    setCode('');
    setValidatedToken(null);
    setError('');
    onTokenCleared?.();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isValidating) {
      validateToken();
    }
  };

  if (validatedToken) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Gift className="h-5 w-5" />
            Valid Token Applied
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-green-700">Token Code</Label>
              <div className="font-mono text-sm bg-white p-2 rounded border">
                {validatedToken.code}
              </div>
            </div>
            <div>
              <Label className="text-green-700">Value</Label>
              <div className="flex items-center gap-1 text-sm bg-white p-2 rounded border">
                <DollarSign className="h-3 w-3" />
                {validatedToken.value} free request{validatedToken.value > 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-green-700">Expires</Label>
            <div className="flex items-center gap-1 text-sm bg-white p-2 rounded border">
              <Calendar className="h-3 w-3" />
              {format(new Date(validatedToken.expiryDate), 'MMMM dd, yyyy')}
            </div>
          </div>

          <Alert className="border-green-300 bg-green-100">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              This token will be automatically applied to your request. No payment will be required.
            </AlertDescription>
          </Alert>

          <Button onClick={clearToken} variant="outline" className="w-full">
            Use Different Token
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Free Request Token
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tokenCode">Token Code</Label>
          <div className="flex gap-2">
            <Input
              id="tokenCode"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              placeholder="Enter token code (e.g., GET-ABC12345)"
              className="font-mono"
              disabled={isValidating}
            />
            <Button 
              onClick={validateToken} 
              disabled={isValidating || !code.trim()}
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Validate'
              )}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Enter a valid token code to get free recommendation letter requests</p>
          <p>• Tokens have expiry dates and can only be used once</p>
          <p>• Contact your administrator if you need a token</p>
        </div>
      </CardContent>
    </Card>
  );
}