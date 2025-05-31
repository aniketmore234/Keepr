interface ChatResponse {
  text: string;
  error: null | string;
  confidence: string;
  sources: string[];
  relevantMemories: Array<{
    title?: string;
    createdAt: string;
    content?: string;
    type: string;
    imagePath: string | null;
    description?: string;
  }>;
}

export const ApiService = {
  sendMessage: async (message: string): Promise<ChatResponse> => {
    try {
      // TODO: Replace with actual API call
      // For now, return a mock response with properly typed relevantMemories
      const currentTime = new Date().toISOString();
      return {
        text: "I understand you said: " + message,
        error: null,
        confidence: "high",
        sources: [],
        relevantMemories: [{
          title: "Sample Memory",
          createdAt: currentTime,
          content: "Sample content",
          type: "text",
          imagePath: null,
          description: "Sample description"
        }]
      };
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }
}; 