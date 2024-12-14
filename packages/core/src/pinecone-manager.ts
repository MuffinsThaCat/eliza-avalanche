import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

interface MemoryMetadata {
 user: string; 
 content: string;
 timestamp: string;
 usedInStories?: string[];
 characterRole?: string;
 interactionCount: number;
 platform?: string; // e.g., 'twitter', 'arena'
 interactionType?: string; // e.g., 'reply', 'mention', 'quote'
 sentiment?: string;
}

export class PineconeMemoryManager {
 private pinecone: Pinecone;
 private openai: OpenAI;
 private index: any;
 
 constructor() {
   this.pinecone = new Pinecone({
     apiKey: process.env.PINECONE_API_KEY!,
     environment: process.env.PINECONE_ENVIRONMENT!
   });

   this.index = this.pinecone.Index(process.env.PINECONE_INDEX!);

   this.openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY
   });
 }

 async getEmbedding(text: string): Promise<number[]> {
   const response = await this.openai.embeddings.create({
     model: "text-embedding-ada-002",
     input: text
   });
   return response.data[0].embedding;
 }

 async storeMemory(
   text: string,
   metadata: Omit<MemoryMetadata, 'timestamp'>
 ) {
   const embedding = await this.getEmbedding(text);
   const id = `mem_${Date.now()}_${Math.random().toString(36).substring(7)}`;

   await this.index.upsert({
     vectors: [{
       id,
       values: embedding,
       metadata: {
         ...metadata,
         content: text,
         timestamp: new Date().toISOString()
       }
     }]
   });

   return id;
 }

 async findSimilarMemories(
   text: string,
   limit: number = 5,
   filterOptions?: Partial<MemoryMetadata>
 ) {
   const queryEmbedding = await this.getEmbedding(text);
   
   // Build filter based on provided options
   const filter = filterOptions ? {
     $and: Object.entries(filterOptions).map(([key, value]) => ({
       [key]: { $eq: value }
     }))
   } : undefined;

   const results = await this.index.query({
     vector: queryEmbedding,
     topK: limit,
     includeMetadata: true,
     filter
   });

   return results.matches || [];
 }

 async findRecurringCharacters(
   minInteractions: number = 3,
   platform?: string
 ) {
   const filter: any = {
     interactionCount: { $gte: minInteractions }
   };

   if (platform) {
     filter.platform = { $eq: platform };
   }

   // Using a zero vector will effectively rank by metadata
   const zeroVector = new Array(1536).fill(0);

   const results = await this.index.query({
     vector: zeroVector,
     topK: 100,
     includeMetadata: true,
     filter
   });

   return results.matches || [];
 }

 async updateStoryReference(memoryId: string, storyId: string) {
   const vector = await this.index.fetch([memoryId]);
   if (!vector.records[memoryId]) return;

   const metadata = vector.records[memoryId].metadata;
   const usedInStories = [...(metadata.usedInStories || []), storyId];
   
   await this.index.update({
     id: memoryId,
     metadata: {
       ...metadata,
       usedInStories,
       lastReferenced: new Date().toISOString()
     }
   });
 }

 async incrementInteractionCount(memoryId: string) {
   const vector = await this.index.fetch([memoryId]);
   if (!vector.records[memoryId]) return;

   const metadata = vector.records[memoryId].metadata;
   
   await this.index.update({
     id: memoryId,
     metadata: {
       ...metadata,
       interactionCount: (metadata.interactionCount || 0) + 1,
       lastInteraction: new Date().toISOString()
     }
   });
 }

 async searchByUser(username: string, limit: number = 10) {
   return await this.findSimilarMemories('', limit, { user: username });
 }

 async getUnusedIdeas(limit: number = 10) {
   const filter = {
     usedInStories: { $exists: false }
   };

   const results = await this.index.query({
     vector: new Array(1536).fill(0),
     topK: limit,
     includeMetadata: true,
     filter
   });

   return results.matches || [];
 }

 async deleteMemory(memoryId: string) {
   await this.index.deleteOne(memoryId);
 }
}
