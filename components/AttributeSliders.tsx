'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AttributeRatings } from '@/lib/openai';

interface AttributeSlidersProps {
  ratings: AttributeRatings;
  onChange: (ratings: AttributeRatings) => void;
  disabled?: boolean;
}

const attributeDefinitions = {
  workEthic: {
    label: 'Work Ethic & Dedication',
    description: 'Commitment to tasks, reliability, and perseverance'
  },
  oralExpression: {
    label: 'Oral Communication',
    description: 'Speaking skills, presentation abilities, and verbal clarity'
  },
  writtenExpression: {
    label: 'Written Communication',
    description: 'Writing quality, clarity, and professional correspondence'
  },
  teamwork: {
    label: 'Teamwork & Collaboration',
    description: 'Ability to work effectively with others and contribute to group success'
  },
  motivation: {
    label: 'Self-Motivation & Drive',
    description: 'Initiative, enthusiasm, and internal drive to succeed'
  },
  criticalThinking: {
    label: 'Critical Thinking',
    description: 'Analytical skills, problem-solving, and logical reasoning'
  },
  initiative: {
    label: 'Initiative & Proactiveness',
    description: 'Taking charge, identifying opportunities, and acting independently'
  },
  independence: {
    label: 'Independence & Self-Reliance',
    description: 'Ability to work autonomously and make sound decisions'
  },
  researchCapability: {
    label: 'Research & Investigation',
    description: 'Research skills, information gathering, and academic inquiry'
  }
};

const ratingLabels = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Fair',
  4: 'Good',
  5: 'Above Average',
  6: 'Strong',
  7: 'Very Strong',
  8: 'Excellent',
  9: 'Outstanding',
  10: 'Exceptional'
};

export function AttributeSliders({ ratings, onChange, disabled = false }: AttributeSlidersProps) {
  const handleRatingChange = (attribute: keyof AttributeRatings, value: number[]) => {
    onChange({
      ...ratings,
      [attribute]: value[0]
    });
  };

  const getRatingLabel = (value: number): string => {
    return ratingLabels[value as keyof typeof ratingLabels] || '';
  };

  const getRatingColor = (value: number): string => {
    if (value <= 3) return 'text-red-600';
    if (value <= 5) return 'text-yellow-600';
    if (value <= 7) return 'text-blue-600';
    return 'text-green-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Attribute Ratings</CardTitle>
        <CardDescription>
          Rate the student on a scale of 1-10 for each attribute. These ratings will be used to generate a personalized recommendation letter.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(attributeDefinitions).map(([key, definition]) => {
          const value = ratings[key as keyof AttributeRatings];
          return (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor={key} className="text-sm font-medium">
                    {definition.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {definition.description}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-semibold ${getRatingColor(value)}`}>
                    {value}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getRatingLabel(value)}
                  </div>
                </div>
              </div>
              
              <div className="px-2">
                <Slider
                  id={key}
                  min={1}
                  max={10}
                  step={1}
                  value={[value]}
                  onValueChange={(newValue) => handleRatingChange(key as keyof AttributeRatings, newValue)}
                  disabled={disabled}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1 (Poor)</span>
                  <span>5 (Average)</span>
                  <span>10 (Exceptional)</span>
                </div>
              </div>
            </div>
          );
        })}
        
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-2">Rating Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Average Rating:</span>
              <span className="ml-2 font-medium">
                {(Object.values(ratings).reduce((sum, val) => sum + val, 0) / Object.values(ratings).length).toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Highest:</span>
              <span className="ml-2 font-medium">
                {Math.max(...Object.values(ratings))}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}