import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // 60 seconds timeout
});

export interface AttributeRatings {
  workEthic: number;
  oralExpression: number;
  writtenExpression: number;
  teamwork: number;
  motivation: number;
  criticalThinking: number;
  initiative: number;
  independence: number;
  researchCapability: number;
}

export interface StyleAnalysis {
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
}

export interface GenerationContext {
  studentName: string;
  studentProfile: {
    enrollmentYear: number;
    completionYear: number;
    department?: string;
  };
  requestDetails: {
    purpose: 'school' | 'scholarship' | 'job';
    recipientName?: string;
    organizationName: string;
    programName?: string;
    deadline: string;
  };
  draftLetter?: string;
  additionalNotes?: string;
}

/**
 * Analyzes the writing style of sample letters using OpenAI
 */
export async function analyzeLecturerStyle(sampleLetters: string[]): Promise<StyleAnalysis> {
  if (sampleLetters.length === 0) {
    throw new Error('At least one sample letter is required for style analysis');
  }

  const combinedSamples = sampleLetters.join('\n\n---\n\n');
  
  const prompt = `Analyze the writing style of these recommendation letters and provide a detailed style profile:

${combinedSamples}

Please analyze and return a JSON object with the following structure:
{
  "tone": "formal/semi-formal/conversational",
  "formality": "very formal/formal/moderate/casual",
  "structure": "traditional/modern/narrative/bullet-point",
  "vocabulary": "academic/professional/accessible/technical",
  "sentenceLength": "short/medium/long/varied",
  "personalityTraits": ["supportive", "direct", "encouraging", etc.],
  "commonPhrases": ["frequently used phrases or expressions"],
  "letterStructure": {
    "introduction": "how they typically start letters",
    "bodyParagraphs": "how they structure the main content",
    "conclusion": "how they typically end letters"
  }
}

Focus on identifying unique patterns, preferred expressions, and structural preferences that make this writer's style distinctive.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in analyzing academic writing styles. Provide detailed, accurate analysis in valid JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const styleAnalysis = JSON.parse(content) as StyleAnalysis;
    return styleAnalysis;
  } catch (error) {
    console.error('Error analyzing lecturer style:', error);
    throw new Error('Failed to analyze writing style');
  }
}

/**
 * Generates embeddings for text content using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generates a personalized recommendation letter using AI
 */
export async function generateLetter(
  context: GenerationContext,
  styleAnalysis: StyleAnalysis,
  attributeRatings: AttributeRatings,
  sampleLetters?: string[]
): Promise<string> {
  const attributeDescriptions = {
    workEthic: 'Work ethic and dedication',
    oralExpression: 'Oral communication and presentation skills',
    writtenExpression: 'Written communication and clarity',
    teamwork: 'Collaboration and teamwork abilities',
    motivation: 'Self-motivation and drive',
    criticalThinking: 'Critical thinking and analytical skills',
    initiative: 'Initiative and proactiveness',
    independence: 'Independence and self-reliance',
    researchCapability: 'Research and investigation skills'
  };

  const ratedAttributes = Object.entries(attributeRatings)
    .map(([key, value]) => `${attributeDescriptions[key as keyof AttributeRatings]}: ${value}/10`)
    .join('\n');

  const styleContext = `
Writing Style Profile:
- Tone: ${styleAnalysis.tone}
- Formality: ${styleAnalysis.formality}
- Structure: ${styleAnalysis.structure}
- Vocabulary: ${styleAnalysis.vocabulary}
- Sentence Length: ${styleAnalysis.sentenceLength}
- Personality Traits: ${styleAnalysis.personalityTraits.join(', ')}
- Common Phrases: ${styleAnalysis.commonPhrases.join(', ')}

Letter Structure Preferences:
- Introduction: ${styleAnalysis.letterStructure.introduction}
- Body Paragraphs: ${styleAnalysis.letterStructure.bodyParagraphs}
- Conclusion: ${styleAnalysis.letterStructure.conclusion}
`;

  const sampleContext = sampleLetters && sampleLetters.length > 0 
    ? `\n\nReference Sample Letters:\n${sampleLetters.join('\n\n---\n\n')}`
    : '';

  const draftContext = context.draftLetter 
    ? `\n\nStudent's Draft Letter (use as reference for content ideas):\n${context.draftLetter}`
    : '';

  const prompt = `Write a personalized recommendation letter for ${context.studentName} applying for ${context.requestDetails.purpose} at ${context.requestDetails.organizationName}${context.requestDetails.programName ? ` (${context.requestDetails.programName})` : ''}.

Student Information:
- Name: ${context.studentName}
- Enrollment Year: ${context.studentProfile.enrollmentYear}
- Completion Year: ${context.studentProfile.completionYear}
${context.studentProfile.department ? `- Department: ${context.studentProfile.department}` : ''}

Application Details:
- Purpose: ${context.requestDetails.purpose}
- Organization: ${context.requestDetails.organizationName}
${context.requestDetails.programName ? `- Program: ${context.requestDetails.programName}` : ''}
${context.requestDetails.recipientName ? `- Recipient: ${context.requestDetails.recipientName}` : ''}
- Deadline: ${context.requestDetails.deadline}

Student Attribute Ratings (1-10 scale):
${ratedAttributes}

${styleContext}${sampleContext}${draftContext}

${context.additionalNotes ? `\nAdditional Notes: ${context.additionalNotes}` : ''}

Please write a compelling recommendation letter that:
1. Matches the identified writing style and tone
2. Uses the preferred letter structure
3. Incorporates the personality traits and common phrases naturally
4. Reflects the attribute ratings appropriately
5. Is specific to the application purpose and organization
6. Maintains authenticity and professionalism
7. Is approximately 300-500 words

The letter should feel like it was written by the original author of the sample letters.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert academic letter writer. Write personalized, authentic recommendation letters that match the provided writing style while highlighting the student\'s strengths appropriately.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return content;
  } catch (error) {
    console.error('Error generating letter:', error);
    throw new Error('Failed to generate recommendation letter');
  }
}

/**
 * Refines an existing letter based on feedback
 */
export async function refineLetter(
  currentLetter: string,
  feedback: string,
  styleAnalysis: StyleAnalysis,
  context: GenerationContext
): Promise<string> {
  const prompt = `Please refine this recommendation letter based on the provided feedback while maintaining the original writing style.

Current Letter:
${currentLetter}

Feedback for Improvement:
${feedback}

Writing Style to Maintain:
- Tone: ${styleAnalysis.tone}
- Formality: ${styleAnalysis.formality}
- Vocabulary: ${styleAnalysis.vocabulary}
- Common Phrases: ${styleAnalysis.commonPhrases.join(', ')}

Student Context:
- Name: ${context.studentName}
- Purpose: ${context.requestDetails.purpose}
- Organization: ${context.requestDetails.organizationName}

Please provide an improved version that addresses the feedback while maintaining the authentic writing style and professional quality.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert editor specializing in academic recommendation letters. Refine letters based on feedback while preserving the original writing style and authenticity.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.6,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return content;
  } catch (error) {
    console.error('Error refining letter:', error);
    throw new Error('Failed to refine recommendation letter');
  }
}

/**
 * Extracts key information from student documents
 */
export async function extractDocumentContext(documentText: string): Promise<{
  achievements: string[];
  skills: string[];
  experiences: string[];
  academicInfo: string[];
}> {
  const prompt = `Analyze this student document and extract key information that would be relevant for a recommendation letter:

${documentText}

Please return a JSON object with the following structure:
{
  "achievements": ["list of notable achievements, awards, honors"],
  "skills": ["list of technical and soft skills"],
  "experiences": ["list of relevant work, research, or project experiences"],
  "academicInfo": ["list of academic performance indicators, courses, projects"]
}

Focus on concrete, specific information that would strengthen a recommendation letter.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing academic documents and extracting relevant information for recommendation letters. Provide structured, accurate information in valid JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('Error extracting document context:', error);
    throw new Error('Failed to extract document context');
  }
}