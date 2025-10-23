'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Wand2, RefreshCw, Eye, EyeOff, Download, Send, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AttributeSliders } from '@/components/AttributeSliders';
import { Switch } from '@/components/ui/switch';
import type { AttributeRatings, GenerationContext } from '@/lib/openai';

interface LetterGenerationInterfaceProps {
  requestId: string;
  studentName: string;
  requestDetails: any;
  studentProfile: any;
  onLetterGenerated?: (letter: string) => void;
  onLetterSaved?: (letterId: string) => void;
}

interface StyleProfile {
  id: string;
  style_analysis: {
    tone: string;
    formality: string;
    structure: string;
    vocabulary: string;
    sentenceLength: string;
    personalityTraits: string[];
    commonPhrases: string[];
    letterStructure: {
      introduction: string;
      bodyParagraphs: string;
      conclusion: string;
    };
  };
  sample_count: number;
  last_analyzed: string;
}

const defaultRatings: AttributeRatings = {
  workEthic: 7,
  oralExpression: 7,
  writtenExpression: 7,
  teamwork: 7,
  motivation: 7,
  criticalThinking: 7,
  initiative: 7,
  independence: 7,
  researchCapability: 7
};

export function LetterGenerationInterface({
  requestId,
  studentName,
  requestDetails,
  studentProfile,
  onLetterGenerated,
  onLetterSaved
}: LetterGenerationInterfaceProps) {
  const [attributeRatings, setAttributeRatings] = useState<AttributeRatings>(defaultRatings);
  const [generatedLetter, setGeneratedLetter] = useState<string>('');
  const [refinementFeedback, setRefinementFeedback] = useState<string>('');
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [showLetterhead, setShowLetterhead] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState('ratings');

  useEffect(() => {
    fetchStyleProfile();
  }, []);

  const fetchStyleProfile = async () => {
    try {
      const response = await fetch('/api/ai/style-profile');
      if (response.ok) {
        const data = await response.json();
        setStyleProfile(data.styleProfile);
      }
    } catch (error) {
      console.error('Error fetching style profile:', error);
    }
  };

  const generateContext = (): GenerationContext => {
    return {
      studentName,
      studentProfile: {
        enrollmentYear: studentProfile.enrollment_year,
        completionYear: studentProfile.completion_year,
        department: studentProfile.department
      },
      requestDetails: {
        purpose: requestDetails.purpose,
        recipientName: requestDetails.details?.recipientName,
        organizationName: requestDetails.details?.organizationName,
        programName: requestDetails.details?.programName,
        deadline: new Date(requestDetails.deadline).toLocaleDateString()
      },
      draftLetter: requestDetails.draft_letter,
      additionalNotes: requestDetails.additional_notes
    };
  };

  const handleGenerateLetter = async () => {
    if (!styleProfile) {
      setError('No style profile found. Please upload sample letters first.');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const context = generateContext();
      const response = await fetch('/api/ai/generate-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, attributeRatings })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate letter');
      }

      const data = await response.json();
      setGeneratedLetter(data.letter);
      setActiveTab('preview');
      onLetterGenerated?.(data.letter);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate letter');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefineLetter = async () => {
    if (!generatedLetter || !refinementFeedback.trim()) {
      setError('Please provide feedback for refinement');
      return;
    }

    setIsRefining(true);
    setError('');

    try {
      const context = generateContext();
      const response = await fetch('/api/ai/refine-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentLetter: generatedLetter,
          feedback: refinementFeedback,
          context
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refine letter');
      }

      const data = await response.json();
      setGeneratedLetter(data.letter);
      setRefinementFeedback('');
      onLetterGenerated?.(data.letter);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to refine letter');
    } finally {
      setIsRefining(false);
    }
  };

  const handleSaveLetter = async () => {
    if (!generatedLetter) {
      setError('No letter to save');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          content: generatedLetter,
          attributeRatings,
          aiGenerated: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save letter');
      }

      const data = await response.json();
      onLetterSaved?.(data.letterId);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save letter');
    } finally {
      setIsSaving(false);
    }
  };

  const formatLetterWithLetterhead = (content: string) => {
    if (!showLetterhead) return content;

    const letterhead = `
UNIVERSITY LETTERHEAD
Department of [Department Name]
[University Name]
[Address]
[City, State, ZIP Code]
[Email] | [Phone]

${new Date().toLocaleDateString()}

${requestDetails.details?.recipientName ? `${requestDetails.details.recipientName}\n` : ''}${requestDetails.details?.organizationName || '[Recipient Organization]'}
[Recipient Address]

Dear ${requestDetails.details?.recipientName ? requestDetails.details.recipientName : 'Hiring Manager/Admissions Committee'},

`;

    return letterhead + content + '\n\nSincerely,\n\n[Your Name]\n[Your Title]\n[Department]\n[University Name]';
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!styleProfile && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No writing style profile found. Please upload sample letters to enable AI generation.
          </AlertDescription>
        </Alert>
      )}

      {styleProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              AI Letter Generation
            </CardTitle>
            <CardDescription>
              Generate a personalized recommendation letter using your writing style and student ratings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <Badge variant="secondary">
                  Style Profile: {styleProfile.sample_count} samples analyzed
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Last updated: {new Date(styleProfile.last_analyzed).toLocaleDateString()}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Style:</strong> {styleProfile.style_analysis.tone}, {styleProfile.style_analysis.formality}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ratings">Student Ratings</TabsTrigger>
          <TabsTrigger value="preview">Letter Preview</TabsTrigger>
          <TabsTrigger value="refinement">Refinement</TabsTrigger>
        </TabsList>

        <TabsContent value="ratings" className="space-y-4">
          <AttributeSliders
            ratings={attributeRatings}
            onChange={setAttributeRatings}
            disabled={isGenerating}
          />
          
          <div className="flex justify-center">
            <Button
              onClick={handleGenerateLetter}
              disabled={isGenerating || !styleProfile}
              size="lg"
              className="min-w-[200px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Letter...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Letter
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Letter Preview</CardTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="letterhead-toggle" className="text-sm">
                    Show Letterhead
                  </Label>
                  <Switch
                    id="letterhead-toggle"
                    checked={showLetterhead}
                    onCheckedChange={setShowLetterhead}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {generatedLetter ? (
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {formatLetterWithLetterhead(generatedLetter)}
                    </pre>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveLetter}
                      disabled={isSaving}
                      variant="default"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Save Letter
                        </>
                      )}
                    </Button>
                    
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Wand2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No letter generated yet. Go to Student Ratings to generate a letter.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refinement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Letter Refinement</CardTitle>
              <CardDescription>
                Provide feedback to improve the generated letter. The AI will refine the content while maintaining your writing style.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatedLetter ? (
                <>
                  <div>
                    <Label htmlFor="feedback">Refinement Feedback</Label>
                    <Textarea
                      id="feedback"
                      placeholder="Describe what you'd like to change or improve in the letter..."
                      value={refinementFeedback}
                      onChange={(e) => setRefinementFeedback(e.target.value)}
                      rows={4}
                      disabled={isRefining}
                    />
                  </div>
                  
                  <Button
                    onClick={handleRefineLetter}
                    disabled={isRefining || !refinementFeedback.trim()}
                  >
                    {isRefining ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Refining Letter...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refine Letter
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Generate a letter first to enable refinement.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}