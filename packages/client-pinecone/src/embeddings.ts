// packages/client-pinecone/src/embeddings.ts
import { Configuration, OpenAIApi } from 'openai';

let openai: OpenAIApi;

export async function initializeEmbeddings(apiKey: string) {
    const configuration = new Configuration({
        apiKey: apiKey
    });
    openai = new OpenAIApi(configuration);
}

export async function generateEmbedding(text: string): Promise<number[]> {
    if (!openai) {
        throw new Error('OpenAI client not initialized. Call initializeEmbeddings first.');
    }

    try {
        const response = await openai.createEmbedding({
            model: "text-embedding-ada-002",
            input: text
        });

        return response.data.data[0].embedding;
    } catch (error) {
        console.error('Failed to generate embedding:', error);
        throw error;
    }
}
