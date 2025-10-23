'use client'

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');

  const handleReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) alert(error.message);
    else alert('Reset link sent!');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-2xl">Forgot Password ?</h1>
      <p>Enter your Email address to get the password reset link</p>
      <Label>Email Address</Label>
      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your Email here" />
      <Button onClick={handleReset} className="bg-green-800 text-white w-full">Proceed Reset</Button>
      <Button variant="outline" asChild>
        <Link href="/login">Back to Sign in</Link>
      </Button>
    </div>
  );
}