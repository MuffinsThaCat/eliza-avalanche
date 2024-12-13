// packages/client-pinecone/src/social.ts

import { generateEmbedding } from './embeddings';

export interface UserInteraction {
    userId: string;
    username: string;
    content: string;
    platform: 'twitter' | 'arena' | 'discord';
    timestamp: number;
    sentiment?: number;
    topics?: string[];
    interests?: string[];
}

export interface CharacterProfile {
    userId: string;
    username: string;
    traits: string[];
    interests: string[];
    style: string;
    interactions: UserInteraction[];
    lastUpdated: number;
}

export interface StoryContext {
    characters: string[];
    theme: string;
    setting: string;
    previousInteractions: string[];
}

export class SocialInteractionManager {
    constructor(private pineconeClient: any) {}

    async storeInteraction(interaction: UserInteraction) {
        const interactionText = `${interaction.username}: ${interaction.content}`;
        const vector = await generateEmbedding(interactionText);
        
        await this.pineconeClient.upsertVector(
            `interaction-${interaction.userId}-${interaction.timestamp}`,
            interactionText,
            {
                type: 'interaction',
                ...interaction
            }
        );

        // Update user profile
        await this.updateCharacterProfile(interaction);
    }

    async updateCharacterProfile(interaction: UserInteraction) {
        const existingProfile = await this.getCharacterProfile(interaction.userId);
        
        const updatedProfile: CharacterProfile = {
            userId: interaction.userId,
            username: interaction.username,
            traits: this.extractTraits(interaction.content, existingProfile?.traits || []),
            interests: this.extractInterests(interaction.content, existingProfile?.interests || []),
            style: this.analyzeWritingStyle(interaction.content),
            interactions: [...(existingProfile?.interactions || []), interaction],
            lastUpdated: Date.now()
        };

        await this.pineconeClient.upsertVector(
            `profile-${interaction.userId}`,
            JSON.stringify(updatedProfile),
            {
                type: 'character_profile',
                userId: interaction.userId,
                username: interaction.username
            }
        );
    }

    async getCharacterProfile(userId: string): Promise<CharacterProfile | null> {
        const results = await this.pineconeClient.querySimilar('', {
            filter: {
                type: 'character_profile',
                userId: userId
            },
            topK: 1
        });

        if (results.length > 0) {
            return JSON.parse(results[0].metadata.profile);
        }
        return null;
    }

    async findSimilarCharacters(profileId: string, limit: number = 5) {
        const profile = await this.getCharacterProfile(profileId);
        if (!profile) return [];

        const profileText = `${profile.traits.join(' ')} ${profile.interests.join(' ')}`;
        return await this.pineconeClient.querySimilar(profileText, {
            filter: { type: 'character_profile' },
            topK: limit
        });
    }

    async generateStoryContext(characters: string[]): Promise<StoryContext> {
        const profiles = await Promise.all(
            characters.map(id => this.getCharacterProfile(id))
        );

        const validProfiles = profiles.filter(p => p !== null);
        const commonInterests = this.findCommonInterests(validProfiles as CharacterProfile[]);
        
        return {
            characters: characters,
            theme: this.selectTheme(commonInterests),
            setting: this.generateSetting(validProfiles as CharacterProfile[]),
            previousInteractions: await this.getRelevantInteractions(characters)
        };
    }

    private extractTraits(content: string, existingTraits: string[]): string[] {
        // Implement trait extraction logic
        // Could use NLP or pattern matching to identify personality traits
        return existingTraits;
    }

    private extractInterests(content: string, existingInterests: string[]): string[] {
        // Implement interest extraction logic
        // Could use topic modeling or keyword extraction
        return existingInterests;
    }

    private analyzeWritingStyle(content: string): string {
        // Implement writing style analysis
        // Could analyze formality, emotion, complexity
        return 'casual';
    }

    private findCommonInterests(profiles: CharacterProfile[]): string[] {
        // Implement logic to find overlapping interests
        const allInterests = profiles.flatMap(p => p.interests);
        return Array.from(new Set(allInterests));
    }

    private selectTheme(interests: string[]): string {
        // Implement theme selection logic based on common interests
        return interests[0] || 'adventure';
    }

    private generateSetting(profiles: CharacterProfile[]): string {
        // Implement setting generation logic based on character profiles
        return 'modern city';
    }

    private async getRelevantInteractions(characters: string[]): Promise<string[]> {
        // Get recent interactions between these characters
        const interactions = await this.pineconeClient.querySimilar('', {
            filter: {
                type: 'interaction',
                userId: { $in: characters }
            },
            topK: 10
        });

        return interactions.map((i: any) => i.metadata.content);
    }
}
