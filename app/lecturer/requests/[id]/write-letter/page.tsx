import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getServerUser } from '@/lib/server-auth';
import { createClient } from '@/lib/supabase';
import { LetterGenerationInterface } from '@/components/lecturer/LetterGenerationInterface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, User, Building, FileText } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface PageProps {
  params: { id: string };
}

async function getRequestDetails(requestId: string, userId: string) {
  const supabase = createClient();
  
  const { data: request, error } = await supabase
    .from('requests')
    .select(`
      *,
      student:profiles!requests_student_id_fkey(
        first_name,
        last_name,
        student_profiles(*)
      )
    `)
    .eq('id', requestId)
    .contains('lecturer_ids', [userId])
    .single();

  if (error || !request) {
    return null;
  }

  return request;
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}

export default async function WriteLetterPage({ params }: PageProps) {
  const user = await getServerUser();
  
  if (!user || user.role !== 'lecturer') {
    notFound();
  }

  const request = await getRequestDetails(params.id, user.id);
  
  if (!request) {
    notFound();
  }

  const studentName = `${request.student.first_name} ${request.student.last_name}`;
  const studentProfile = request.student.student_profiles;
  const purposeLabels = {
    school: 'School Application',
    scholarship: 'Scholarship Application',
    job: 'Job Application'
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Request Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Write Recommendation Letter
              </CardTitle>
              <CardDescription>
                Generate an AI-powered recommendation letter for {studentName}
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {purposeLabels[request.purpose as keyof typeof purposeLabels]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{studentName}</p>
                <p className="text-xs text-muted-foreground">
                  {studentProfile.enrollment_year} - {studentProfile.completion_year}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {request.details?.organizationName || 'Organization'}
                </p>
                {request.details?.programName && (
                  <p className="text-xs text-muted-foreground">
                    {request.details.programName}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Due: {new Date(request.deadline).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.ceil((new Date(request.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining
                </p>
              </div>
            </div>
          </div>
          
          {request.draft_letter && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Student's Draft Letter</h4>
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p className="line-clamp-3">{request.draft_letter}</p>
              </div>
            </div>
          )}
          
          {request.additional_notes && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Additional Notes</h4>
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p>{request.additional_notes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Letter Generation Interface */}
      <Suspense fallback={<LoadingSpinner />}>
        <LetterGenerationInterface
          requestId={request.id}
          studentName={studentName}
          requestDetails={request}
          studentProfile={studentProfile}
          onLetterGenerated={(letter) => {
            console.log('Letter generated:', letter.substring(0, 100) + '...');
          }}
          onLetterSaved={(letterId) => {
            console.log('Letter saved with ID:', letterId);
            // Could redirect to letter review page or show success message
          }}
        />
      </Suspense>
    </div>
  );
}