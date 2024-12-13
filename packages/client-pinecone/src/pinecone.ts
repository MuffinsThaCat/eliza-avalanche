// packages/client-pinecone/src/pinecone.ts
import { PineconeClient } from "@pinecone-database/pinecone";
import { IAgentRuntime } from "@ai16z/eliza";
import { VectorMetadata, VectorQueryOptions } from "./types";
import { generateEmbedding, initializeEmbeddings } from "./embeddings";
import { validatePineconeEnvironment } from "./environment";

export class PineconeClientInterface {
    private client: PineconeClient;
    private index: any;
    private runtime: IAgentRuntime;

    constructor(runtime: IAgentRuntime) {
        this.runtime = runtime;
        this.client = new PineconeClient();
    }

    static async start(runtime: IAgentRuntime) {
        const instance = new PineconeClientInterface(runtime);
        await instance.initialize();
        return instance;
    }

    private async initialize() {
        const env = this.runtime.getCharacter().settings?.secrets;
        if (!validatePineconeEnvironment(env)) {
            throw new Error('Missing required Pinecone environment variables');
        }

        try {
            // Initialize OpenAI for embeddings
            await initializeEmbeddings(env.OPENAI_API_KEY);

            // Initialize Pinecone
            await this.client.init({
                apiKey: env.PINECONE_API_KEY,
                environment: env.PINECONE_ENVIRONMENT,
            });

            this.index = this.client.Index(env.PINECONE_INDEX_NAME);
            await this.runtime.logToFirebase('system', {
                event: 'pinecone_initialized',
                timestamp: Date.now()
            });
        } catch (error) {
            await this.runtime.logToFirebase('errors', {
                context: 'pinecone_initialization',
                error: error.message,
                timestamp: Date.now()
            });
            throw error;
        }
    }

    async upsertVector(
        id: string,
        text: string,
        metadata: VectorMetadata
    ): Promise<void> {
        try {
            const vector = await generateEmbedding(text);
            
            await this.index.upsert({
                upsertRequest: {
                    vectors: [{
                        id,
                        values: vector,
                        metadata: {
                            ...metadata,
                            text
                        }
                    }]
                }
            });

            await this.runtime.logToFirebase('vectors', {
                action: 'upsert',
                id,
                metadata,
                timestamp: Date.now()
            });
        } catch (error) {
            await this.runtime.logToFirebase('errors', {
                context: 'vector_upsert',
                error: error.message,
                id,
                timestamp: Date.now()
            });
            throw error;
        }
    }

    async querySimilar(
        text: string,
        options: VectorQueryOptions = {}
    ): Promise<any[]> {
        try {
            const vector = await generateEmbedding(text);
            
            const queryResponse = await this.index.query({
                queryRequest: {
                    vector,
                    topK: options.topK || 5,
                    namespace: options.namespace,
                    filter: options.filter
                }
            });

            await this.runtime.logToFirebase('queries', {
                type: 'similarity',
                options,
                matchCount: queryResponse.matches?.length || 0,
                timestamp: Date.now()
            });

            return queryResponse.matches || [];
        } catch (error) {
            await this.runtime.logToFirebase('errors', {
                context: 'vector_query',
                error: error.message,
                timestamp: Date.now()
            });
            throw error;
        }
    }

    async deleteVectors(
        filter: Record<string, any>,
        namespace?: string
    ): Promise<void> {
        try {
            await this.index.delete1({
                deleteRequest: {
                    filter,
                    namespace
                }
            });

            await this.runtime.logToFirebase('vectors', {
                action: 'delete',
                filter,
                namespace,
                timestamp: Date.now()
            });
        } catch (error) {
            await this.runtime.logToFirebase('errors', {
                context: 'vector_delete',
                error: error.message,
                timestamp: Date.now()
            });
            throw error;
        }
    }
}
