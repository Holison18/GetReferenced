'use client'

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RichTextEditor from '@/components/RichTextEditor';
import AttributeSliders from '@/components/AttributeSliders';
import { generateLetter } from '@/lib/openai';
import { Button } from '@/components/ui/button';

export default function RequestDetails({ params }: { params: { id: string } }) {
  const [draft, setDraft] = useState('');
  const [attributes, setAttributes] = useState<Record<string, number>>({ 
    'work ethic': 5,
    'oral expression': 5,
    'written expression': 5,
    'teamwork': 5,
    'motivation': 5,
    'critical thinking': 5,
    'initiative': 5,
    'independence': 5,
    'research capability': 5
  });

  const handleGenerate = async () => {
    const generated = await generateLetter(draft, [], attributes);
    if (generated) {
      setDraft(generated);
    }
  };

  return (
    <div className="p-8">
      <h1>Student Request Details</h1>
      {/* Student info, request details */}
      <Tabs defaultValue="ai">
        <TabsList>
          <TabsTrigger value="student">Student's Draft</TabsTrigger>
          <TabsTrigger value="ai">AI Enhanced</TabsTrigger>
          <TabsTrigger value="manual">Manual Edit</TabsTrigger>
        </TabsList>
        <TabsContent value="ai">
          <AttributeSliders attributes={attributes} onChange={setAttributes} />
          <Button onClick={handleGenerate}>Generate</Button>
        </TabsContent>
        <TabsContent value="manual">
          <RichTextEditor value={draft} onChange={setDraft} />
        </TabsContent>
      </Tabs>
      <Button>Preview</Button>
      <Button>Submit</Button>
    </div>
  );
}