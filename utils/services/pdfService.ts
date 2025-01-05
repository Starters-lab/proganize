import { supabase } from '../supabase/instance';
import { capitalize } from '../helpers';
import { getToken } from '../supabaseOperations';

interface PDFContent {
  content: string;
  metadata?: {
    title?: string;
    author?: string;
    keywords?: string[];
    pageCount?: number;
    status?: 'processing' | 'complete' | 'error';
    error?: string;
  } | null;
}

export const pdfService = {
  async saveExtractedContent(
    pdfConversationId: string,
    content: PDFContent,
    userId: string
  ) {
    console.log('Saving PDF content:', {
      pdfConversationId,
      contentLength: content.content.length,
      metadata: content.metadata,
      userId
    });
    try {
      const { data, error } = await supabase
        .from('pdf_extracted_content')
        .insert({
          pdf_conversation_id: pdfConversationId,
          content: content.content,
          metadata: content.metadata || {},
          user_id: userId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique violation
          // Try to update instead
          const { data: updateData, error: updateError } = await supabase
            .from('pdf_extracted_content')
            .update({
              content: content.content,
              metadata: content.metadata || {},
            })
            .eq('pdf_conversation_id', pdfConversationId)
            .eq('user_id', userId)
            .select()
            .single();

          if (updateError) return null;
          return updateData;
        }
        return null;
      }

      return data;
    } catch {
      return null;
    }
  },

  async getExtractedContent(pdfConversationId: string | undefined, userId?: string) {
    if (!pdfConversationId) return null;
    
    try {
      const query = supabase
        .from('pdf_extracted_content')
        .select('*')
        .eq('pdf_conversation_id', pdfConversationId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (userId) {
        query.eq('user_id', userId);
      }

      const { data, error } = await query;
      console.log(data);
      if (error) return null;
      return data?.[0] || null;
    } catch {
      return null;
    }
  },

  formatTitle(title: string): string {
    return capitalize(title.toLowerCase());
  },

  // Helper function to generate initial system message with PDF context
  generateSystemContext(content: string): string {
    return `You are an AI assistant helping with a PDF document. Here's the context of the document:

${content}

Please help the user understand this document by:
1. Answering questions about its content
2. Explaining complex concepts
3. Providing summaries when requested
4. Identifying key points and themes
5. Making connections between different parts of the document
6. Suggesting related topics for further research

Remember to:
- Be clear and concise in your explanations
- Use examples when helpful
- Break down complex ideas into simpler terms
- Cite specific parts of the document when relevant
- Maintain academic integrity by not making claims beyond what's in the document`;
  },

  async generateSummary(content: string): Promise<string> {
    const token = await getToken();
    const response = await fetch('/api/pdf-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`, 
      },
      body: JSON.stringify({
        content,
        type: 'summary',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate summary');
    }

    const data = await response.json();
    return data.summary;
  },

  async extractKeyPoints(content: string): Promise<string[]> {
    const token = await getToken();
    const response = await fetch('/api/pdf-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content,
        type: 'keyPoints',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to extract key points');
    }

    const data = await response.json();
    return data.keyPoints;
  },

  async identifyTopics(content: string): Promise<string[]> {
    const token = await getToken();
    const response = await fetch('/api/pdf-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content,
        type: 'topics',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to identify topics');
    }

    const data = await response.json();
    return data.topics;
  },

  async generateTOC(content: string): Promise<Array<{ title: string; page: number }>> {
    const token = await getToken();
    const response = await fetch('/api/pdf-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content,
        type: 'toc',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate table of contents');
    }

    const data = await response.json();
    return data.toc;
  },

  async generateFlashcards(content: string): Promise<Array<{ question: string; answer: string }>> {
    const token = await getToken();
    const response = await fetch('/api/pdf-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content,
        type: 'flashcards',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate flashcards');
    }

    const data = await response.json();
    return data.flashcards;
  },

  async generateQuiz(content: string): Promise<Array<{ question: string; options: string[]; answer: string }>> {
    const token = await getToken();
    const response = await fetch('/api/pdf-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,

      },
      body: JSON.stringify({
        content,
        type: 'quiz',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate quiz');
    }

    const data = await response.json();
    return data.quiz;
  },
};
