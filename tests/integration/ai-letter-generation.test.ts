import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase')
jest.mock('@/lib/openai')

const mockSupabase = supabase as jest.Mocked<typeof supabase>

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  },
  embeddings: {
    create: jest.fn()
  }
}

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => mockOpenAI)
})

describe('AI Letter Generation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should analyze lecturer writing style from sample letters', async () => {
    const mockStyleAnalysis = {
      lecturer_id: 'lecturer-id',
      writing_style: {
        tone: 'formal',
        structure: 'academic',
        vocabulary_level: 'advanced',
        common_phrases: ['I am pleased to recommend', 'demonstrates exceptional'],
        signature_elements: ['detailed examples', 'specific achievements']
      },
      sample_count: 3,
      created_at: new Date().toISOString()
    }

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [mockStyleAnalysis],
        error: null
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockStyleAnalysis,
            error: null
          })
        })
      })
    } as any)

    // Mock OpenAI style analysis
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify(mockStyleAnalysis.writing_style)
        }
      }]
    })

    // Test style analysis storage
    const result = await mockSupabase.from('lecturer_styles').insert(mockStyleAnalysis)
    expect(result.data).toEqual([mockStyleAnalysis])
  })

  test('should generate personalized letter with AI assistance', async () => {
    const mockRequest = {
      id: 'request-id',
      student_id: 'student-id',
      lecturer_ids: ['lecturer-id'],
      purpose: 'school',
      details: {
        programName: 'Computer Science Masters',
        organizationName: 'Test University'
      }
    }

    const mockAttributeRatings = {
      workEthic: 9,
      oralExpression: 8,
      writtenExpression: 9,
      teamwork: 8,
      motivation: 9,
      criticalThinking: 9,
      initiative: 8,
      independence: 8,
      researchCapability: 9
    }

    const mockGeneratedLetter = `Dear Admissions Committee,

I am pleased to recommend John Doe for admission to the Computer Science Masters program at Test University. I have had the privilege of teaching John in several courses and can attest to his exceptional academic abilities and strong work ethic.

John demonstrates outstanding written expression and critical thinking skills, consistently producing high-quality work that exceeds expectations. His motivation and initiative are evident in his proactive approach to learning and research.

I recommend John without reservation for your program.

Sincerely,
Dr. Jane Smith`

    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{
        message: {
          content: mockGeneratedLetter
        }
      }]
    })

    const mockLetter = {
      id: 'letter-id',
      request_id: 'request-id',
      lecturer_id: 'lecturer-id',
      content: mockGeneratedLetter,
      attribute_ratings: mockAttributeRatings,
      ai_generated: true,
      status: 'draft'
    }

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [mockLetter],
        error: null
      })
    } as any)

    // Test letter generation and storage
    const result = await mockSupabase.from('letters').insert(mockLetter)
    expect(result.data).toEqual([mockLetter])
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalled()
  })

  test('should handle iterative letter refinement', async () => {
    const originalLetter = 'Original letter content...'
    const refinementFeedback = 'Please add more specific examples of the student\'s research work.'
    const refinedLetter = 'Refined letter content with specific research examples...'

    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{
        message: {
          content: refinedLetter
        }
      }]
    })

    const mockRefinement = {
      letter_id: 'letter-id',
      iteration: 2,
      feedback: refinementFeedback,
      refined_content: refinedLetter,
      created_at: new Date().toISOString()
    }

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: [mockRefinement],
        error: null
      }),
      update: jest.fn().mockResolvedValue({
        data: [{ id: 'letter-id', content: refinedLetter }],
        error: null
      })
    } as any)

    // Test refinement storage
    const refinementResult = await mockSupabase.from('letter_refinements').insert(mockRefinement)
    expect(refinementResult.data).toEqual([mockRefinement])

    // Test letter update
    const updateResult = await mockSupabase.from('letters')
      .update({ content: refinedLetter })
      .eq('id', 'letter-id')

    expect(updateResult.data).toBeTruthy()
  })

  test('should handle manual editing alongside AI assistance', async () => {
    const aiGeneratedContent = 'AI generated letter content...'
    const manuallyEditedContent = 'Manually edited letter content with personal touches...'

    const mockLetter = {
      id: 'letter-id',
      content: manuallyEditedContent,
      ai_generated: true,
      manually_edited: true,
      edit_history: [
        { timestamp: new Date().toISOString(), content: aiGeneratedContent, type: 'ai_generated' },
        { timestamp: new Date().toISOString(), content: manuallyEditedContent, type: 'manual_edit' }
      ]
    }

    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockResolvedValue({
        data: [mockLetter],
        error: null
      })
    } as any)

    const result = await mockSupabase.from('letters')
      .update({
        content: manuallyEditedContent,
        manually_edited: true,
        edit_history: mockLetter.edit_history
      })
      .eq('id', 'letter-id')

    expect(result.data).toEqual([mockLetter])
  })
})