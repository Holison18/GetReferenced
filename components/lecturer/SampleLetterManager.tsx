'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, Upload, Trash2, Plus, FileText, Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SampleLetter {
  id: string;
  title: string;
  content: string;
  category?: string;
  file_url?: string;
  created_at: string;
}

interface StyleProfile {
  style_analysis: {
    tone: string;
    formality: string;
    structure: string;
    vocabulary: string;
    sentenceLength: string;
    personalityTraits: string[];
    commonPhrases: string[];
  };
  sample_count: number;
  last_analyzed: string;
}

const letterCategories = [
  'Academic Program',
  'Scholarship',
  'Job Application',
  'Graduate School',
  'Research Position',
  'Internship',
  'General'
];

export function SampleLetterManager() {
  const [sampleLetters, setSampleLetters] = useState<SampleLetter[]>([]);
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string>('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Form state
  const [newLetter, setNewLetter] = useState({
    title: '',
    content: '',
    category: ''
  });

  useEffect(() => {
    fetchSampleLetters();
    fetchStyleProfile();
  }, []);

  const fetchSampleLetters = async () => {
    try {
      const response = await fetch('/api/ai/sample-letters');
      if (response.ok) {
        const data = await response.json();
        setSampleLetters(data.sampleLetters);
      }
    } catch (error) {
      console.error('Error fetching sample letters:', error);
      setError('Failed to load sample letters');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleUploadLetter = async () => {
    if (!newLetter.title.trim() || !newLetter.content.trim()) {
      setError('Title and content are required');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const response = await fetch('/api/ai/sample-letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLetter)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload letter');
      }

      const data = await response.json();
      setSampleLetters(prev => [data.sampleLetter, ...prev]);
      setNewLetter({ title: '', content: '', category: '' });
      setShowUploadDialog(false);
      
      // Refresh style profile
      await fetchStyleProfile();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to upload letter');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteLetter = async (letterId: string) => {
    if (!confirm('Are you sure you want to delete this sample letter?')) {
      return;
    }

    try {
      const response = await fetch(`/api/ai/sample-letters/${letterId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete letter');
      }

      setSampleLetters(prev => prev.filter(letter => letter.id !== letterId));
      
      // Refresh style profile
      await fetchStyleProfile();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete letter');
    }
  };

  const handleAnalyzeStyle = async () => {
    if (sampleLetters.length === 0) {
      setError('Upload at least one sample letter before analyzing style');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const response = await fetch('/api/ai/style-profile', {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze style');
      }

      const data = await response.json();
      setStyleProfile(data.styleProfile);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to analyze style');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Style Profile Summary */}
      {styleProfile && (
        <Card>
          <CardHeader>
            <CardTitle>Writing Style Profile</CardTitle>
            <CardDescription>
              AI analysis of your writing style based on {styleProfile.sample_count} sample letters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Tone</Label>
                <Badge variant="secondary">{styleProfile.style_analysis.tone}</Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Formality</Label>
                <Badge variant="secondary">{styleProfile.style_analysis.formality}</Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Structure</Label>
                <Badge variant="secondary">{styleProfile.style_analysis.structure}</Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Vocabulary</Label>
                <Badge variant="secondary">{styleProfile.style_analysis.vocabulary}</Badge>
              </div>
            </div>
            
            {styleProfile.style_analysis.personalityTraits.length > 0 && (
              <div className="mt-4">
                <Label className="text-xs text-muted-foreground">Personality Traits</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {styleProfile.style_analysis.personalityTraits.map((trait, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {trait}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleAnalyzeStyle}
                disabled={isAnalyzing || sampleLetters.length === 0}
                variant="outline"
                size="sm"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Re-analyze Style
                  </>
                )}
              </Button>
              <div className="text-xs text-muted-foreground flex items-center">
                Last analyzed: {new Date(styleProfile.last_analyzed).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Letters Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sample Letters</CardTitle>
              <CardDescription>
                Upload your previous recommendation letters to train the AI on your writing style
              </CardDescription>
            </div>
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Sample Letter
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload Sample Letter</DialogTitle>
                  <DialogDescription>
                    Add a previous recommendation letter to improve AI generation quality
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Letter Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Graduate School Recommendation for John Doe"
                      value={newLetter.title}
                      onChange={(e) => setNewLetter(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category (Optional)</Label>
                    <Select
                      value={newLetter.category}
                      onValueChange={(value) => setNewLetter(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {letterCategories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="content">Letter Content</Label>
                    <Textarea
                      id="content"
                      placeholder="Paste the full content of your recommendation letter here..."
                      value={newLetter.content}
                      onChange={(e) => setNewLetter(prev => ({ ...prev, content: e.target.value }))}
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowUploadDialog(false)}
                      disabled={isUploading}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUploadLetter} disabled={isUploading}>
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Letter
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {sampleLetters.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Sample Letters</h3>
              <p className="text-muted-foreground mb-4">
                Upload your previous recommendation letters to enable AI-powered letter generation
              </p>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Sample Letter
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sampleLetters.map((letter) => (
                <Card key={letter.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{letter.title}</h4>
                        {letter.category && (
                          <Badge variant="outline" className="mt-1">
                            {letter.category}
                          </Badge>
                        )}
                        <p className="text-sm text-muted-foreground mt-2">
                          {letter.content.substring(0, 200)}...
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Added: {new Date(letter.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLetter(letter.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {!styleProfile && sampleLetters.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You have {sampleLetters.length} sample letter(s) but no style profile. 
                    <Button
                      variant="link"
                      className="p-0 h-auto ml-1"
                      onClick={handleAnalyzeStyle}
                      disabled={isAnalyzing}
                    >
                      Analyze your writing style now
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}