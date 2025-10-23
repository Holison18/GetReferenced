import { getServerUser } from '@/lib/server-auth';
import { notFound } from 'next/navigation';
import { SampleLetterManager } from '@/components/lecturer/SampleLetterManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wand2, FileText } from 'lucide-react';

export default async function SampleLettersPage() {
  const user = await getServerUser();
  
  if (!user || user.role !== 'lecturer') {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sample Letters & AI Style</h1>
          <p className="text-muted-foreground">
            Manage your sample letters and train the AI to match your writing style
          </p>
        </div>
      </div>

      {/* Information Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            How AI Letter Generation Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <FileText className="mx-auto h-8 w-8 mb-2 text-primary" />
              <h3 className="font-medium mb-1">1. Upload Samples</h3>
              <p className="text-sm text-muted-foreground">
                Add your previous recommendation letters to train the AI
              </p>
            </div>
            
            <div className="text-center p-4 bg-muted rounded-lg">
              <Wand2 className="mx-auto h-8 w-8 mb-2 text-primary" />
              <h3 className="font-medium mb-1">2. Style Analysis</h3>
              <p className="text-sm text-muted-foreground">
                AI analyzes your tone, structure, and writing patterns
              </p>
            </div>
            
            <div className="text-center p-4 bg-muted rounded-lg">
              <FileText className="mx-auto h-8 w-8 mb-2 text-primary" />
              <h3 className="font-medium mb-1">3. Generate Letters</h3>
              <p className="text-sm text-muted-foreground">
                Create personalized letters that match your style
              </p>
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Tips for Better AI Generation:
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Upload at least 3-5 sample letters for better style analysis</li>
              <li>• Include letters for different purposes (academic, job, scholarship)</li>
              <li>• Use complete letters rather than fragments</li>
              <li>• Re-analyze your style after adding new samples</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Sample Letter Manager */}
      <SampleLetterManager />
    </div>
  );
}