import { createClient } from '@/lib/supabase';
import { 
  analyzeLecturerStyle, 
  generateEmbedding, 
  generateLetter, 
  refineLetter,
  extractDocumentContext,
  type StyleAnalysis,
  type AttributeRatings,
  type GenerationContext 
} from '@/lib/openai';

export interface SampleLetter {
  id: string;
  lecturer_id: string;
  title: string;
  content: string;
  category?: string;
  file_url?: string;
  embedding?: number[];
  created_at: string;
  updated_at: string;
}

export interface StyleProfile {
  id: string;
  lecturer_id: string;
  style_analysis: StyleAnalysis;
  embedding_summary?: number[];
  sample_count: number;
  last_analyzed: string;
  created_at: string;
  updated_at: string;
}

export class AILetterService {
  private supabase = createClient();

  /**
   * Upload and process a sample letter for a lecturer
   */
  async uploadSampleLetter(
    lecturerId: string,
    title: string,
    content: string,
    category?: string,
    fileUrl?: string
  ): Promise<SampleLetter> {
    try {
      // Generate embedding for the letter content
      const embedding = await generateEmbedding(content);

      // Insert sample letter into database
      const { data, error } = await this.supabase
        .from('sample_letters')
        .insert({
          lecturer_id: lecturerId,
          title,
          content,
          category,
          file_url: fileUrl,
          embedding
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save sample letter: ${error.message}`);
      }

      // Update style profile after adding new sample
      await this.updateStyleProfile(lecturerId);

      return data;
    } catch (error) {
      console.error('Error uploading sample letter:', error);
      throw error;
    }
  }

  /**
   * Get all sample letters for a lecturer
   */
  async getSampleLetters(lecturerId: string): Promise<SampleLetter[]> {
    const { data, error } = await this.supabase
      .from('sample_letters')
      .select('*')
      .eq('lecturer_id', lecturerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch sample letters: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Delete a sample letter
   */
  async deleteSampleLetter(letterId: string, lecturerId: string): Promise<void> {
    const { error } = await this.supabase
      .from('sample_letters')
      .delete()
      .eq('id', letterId)
      .eq('lecturer_id', lecturerId);

    if (error) {
      throw new Error(`Failed to delete sample letter: ${error.message}`);
    }

    // Update style profile after removing sample
    await this.updateStyleProfile(lecturerId);
  }

  /**
   * Update or create style profile for a lecturer
   */
  async updateStyleProfile(lecturerId: string): Promise<StyleProfile> {
    try {
      // Get all sample letters for the lecturer
      const sampleLetters = await this.getSampleLetters(lecturerId);
      
      if (sampleLetters.length === 0) {
        throw new Error('No sample letters available for style analysis');
      }

      // Analyze writing style
      const letterContents = sampleLetters.map(letter => letter.content);
      const styleAnalysis = await analyzeLecturerStyle(letterContents);

      // Generate summary embedding
      const combinedContent = letterContents.join('\n\n');
      const embeddingSummary = await generateEmbedding(combinedContent);

      // Upsert style profile
      const { data, error } = await this.supabase
        .from('style_profiles')
        .upsert({
          lecturer_id: lecturerId,
          style_analysis: styleAnalysis,
          embedding_summary: embeddingSummary,
          sample_count: sampleLetters.length,
          last_analyzed: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update style profile: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error updating style profile:', error);
      throw error;
    }
  }

  /**
   * Get style profile for a lecturer
   */
  async getStyleProfile(lecturerId: string): Promise<StyleProfile | null> {
    const { data, error } = await this.supabase
      .from('style_profiles')
      .select('*')
      .eq('lecturer_id', lecturerId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new Error(`Failed to fetch style profile: ${error.message}`);
    }

    return data;
  }

  /**
   * Generate a recommendation letter using AI
   */
  async generateRecommendationLetter(
    lecturerId: string,
    context: GenerationContext,
    attributeRatings: AttributeRatings
  ): Promise<string> {
    try {
      // Get lecturer's style profile
      const styleProfile = await this.getStyleProfile(lecturerId);
      if (!styleProfile) {
        throw new Error('No style profile found. Please upload sample letters first.');
      }

      // Get sample letters for additional context
      const sampleLetters = await this.getSampleLetters(lecturerId);
      const sampleContents = sampleLetters.slice(0, 3).map(letter => letter.content); // Use up to 3 samples

      // Generate the letter
      const generatedLetter = await generateLetter(
        context,
        styleProfile.style_analysis,
        attributeRatings,
        sampleContents
      );

      return generatedLetter;
    } catch (error) {
      console.error('Error generating recommendation letter:', error);
      throw error;
    }
  }

  /**
   * Refine an existing letter based on feedback
   */
  async refineRecommendationLetter(
    lecturerId: string,
    currentLetter: string,
    feedback: string,
    context: GenerationContext
  ): Promise<string> {
    try {
      // Get lecturer's style profile
      const styleProfile = await this.getStyleProfile(lecturerId);
      if (!styleProfile) {
        throw new Error('No style profile found. Please upload sample letters first.');
      }

      // Refine the letter
      const refinedLetter = await refineLetter(
        currentLetter,
        feedback,
        styleProfile.style_analysis,
        context
      );

      return refinedLetter;
    } catch (error) {
      console.error('Error refining recommendation letter:', error);
      throw error;
    }
  }

  /**
   * Extract context from student documents
   */
  async extractStudentContext(documentText: string): Promise<{
    achievements: string[];
    skills: string[];
    experiences: string[];
    academicInfo: string[];
  }> {
    try {
      return await extractDocumentContext(documentText);
    } catch (error) {
      console.error('Error extracting student context:', error);
      throw error;
    }
  }

  /**
   * Save a generated letter to the database
   */
  async saveLetter(
    requestId: string,
    lecturerId: string,
    content: string,
    attributeRatings: AttributeRatings,
    aiGenerated: boolean = true
  ): Promise<void> {
    const { error } = await this.supabase
      .from('letters')
      .insert({
        request_id: requestId,
        lecturer_id: lecturerId,
        content,
        attribute_ratings: attributeRatings,
        ai_generated: aiGenerated
      });

    if (error) {
      throw new Error(`Failed to save letter: ${error.message}`);
    }
  }

  /**
   * Update an existing letter
   */
  async updateLetter(
    letterId: string,
    content: string,
    attributeRatings?: AttributeRatings
  ): Promise<void> {
    const updateData: any = { content };
    if (attributeRatings) {
      updateData.attribute_ratings = attributeRatings;
    }

    const { error } = await this.supabase
      .from('letters')
      .update(updateData)
      .eq('id', letterId);

    if (error) {
      throw new Error(`Failed to update letter: ${error.message}`);
    }
  }

  /**
   * Get a letter by ID
   */
  async getLetter(letterId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('letters')
      .select(`
        *,
        request:requests(*),
        lecturer:profiles(*)
      `)
      .eq('id', letterId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch letter: ${error.message}`);
    }

    return data;
  }

  /**
   * Get letters for a specific request
   */
  async getLettersForRequest(requestId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('letters')
      .select(`
        *,
        lecturer:profiles(first_name, last_name)
      `)
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch letters for request: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Submit a letter (mark as completed)
   */
  async submitLetter(letterId: string): Promise<void> {
    const { error } = await this.supabase
      .from('letters')
      .update({
        submitted_at: new Date().toISOString(),
        declaration_completed: true
      })
      .eq('id', letterId);

    if (error) {
      throw new Error(`Failed to submit letter: ${error.message}`);
    }

    // Update request status to completed
    const letter = await this.getLetter(letterId);
    if (letter) {
      await this.supabase
        .from('requests')
        .update({ status: 'completed' })
        .eq('id', letter.request_id);
    }
  }
}

// Export singleton instance
export const aiLetterService = new AILetterService();