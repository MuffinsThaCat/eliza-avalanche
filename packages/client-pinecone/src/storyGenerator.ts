// packages/client-pinecone/src/storyGenerator.ts

export interface StoryTemplate {
    format: 'tweet' | 'thread' | 'reply';
    maxLength: number;
    style: string;
    includeHashtags: boolean;
}

export class StoryGenerator {
    constructor(
        private socialManager: SocialInteractionManager,
        private pineconeClient: any
    ) {}

    async generateStoryWithCharacters(
        participants: string[],
        template: StoryTemplate
    ) {
        // Get context for the story
        const context = await this.socialManager.generateStoryContext(participants);
        
        // Build character descriptions
        const characterDescriptions = await this.buildCharacterDescriptions(participants);
        
        // Generate story elements
        const storyElements = {
            characters: characterDescriptions,
            setting: context.setting,
            theme: context.theme,
            previousInteractions: context.previousInteractions,
            format: template.format,
            style: template.style
        };

        // Store story context for future reference
        await this.storeStoryContext(storyElements);

        return this.formatStory(storyElements, template);
    }

    private async buildCharacterDescriptions(userIds: string[]) {
        const descriptions = [];
        
        for (const userId of userIds) {
            const profile = await this.socialManager.getCharacterProfile(userId);
            if (profile) {
                descriptions.push({
                    username: profile.username,
                    traits: profile.traits,
                    style: profile.style,
                    role: this.assignCharacterRole(profile)
                });
            }
        }
        
        return descriptions;
    }

    private assignCharacterRole(profile: CharacterProfile) {
        // Analyze profile traits and interests to assign a suitable role
        // Could be protagonist, mentor, ally, etc.
        return 'protagonist';
    }

    private async storeStoryContext(storyElements: any) {
        const contextText = JSON.stringify(storyElements);
        await this.pineconeClient.upsertVector(
            `story-${Date.now()}`,
            contextText,
            {
                type: 'story_context',
                characters: storyElements.characters.map((c: any) => c.username),
                theme: storyElements.theme,
                timestamp: Date.now()
            }
        );
    }

    private formatStory(storyElements: any, template: StoryTemplate): string {
        // Implement story formatting logic based on template
        // Could include character mentions, hashtags, etc.
        const mentions = storyElements.characters
            .map((c: any) => `@${c.username}`)
            .join(' ');
            
        return `A story featuring ${mentions}...`;
    }

    async findSimilarStories(theme: string, characters: string[]) {
        // Find similar stories for inspiration
        return await this.pineconeClient.querySimilar(theme, {
            filter: {
                type: 'story_context',
                characters: { $in: characters }
            },
            topK: 5
        });
    }
}
