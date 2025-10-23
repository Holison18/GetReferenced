'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/button';

export default function StudentRequestDetails({ params }: { params: { id: string } }) {
  const [request, setRequest] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchRequest = async () => {
      const { data } = await supabase.from('requests').select('*').eq('id', params.id).single();
      setRequest(data);
    };
    fetchRequest();
  }, [params.id]);

  const handleReassign = async () => {
    // Logic to reassign: update lecturer_id, notify original
    await supabase.from('requests').update({ status: 'Reassigned' }).eq('id', params.id);
    // Send notification
    router.push('/student/dashboard');
  };

  const handleComplain = async () => {
    // Raise complaint to admin/lecturer
    await supabase.from('complaints').insert({ request_id: params.id, message: 'Done but unconfirmed' });
  };

  if (!request) return <p>Loading...</p>;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="student" />
      <div className="flex-1 p-8">
        <h1>Request Details</h1>
        <Card>
          <CardHeader>Status: {request.status}</CardHeader>
          <CardContent>
            <p>Purpose: {request.purpose}</p>
            {/* Other details: school, deadline, etc. */}
            {request.status === 'Pending' && <Button onClick={handleReassign}>Reassign</Button>}
            {request.status === 'Completed' && !request.confirmed && <Button onClick={handleComplain}>Complain</Button>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}