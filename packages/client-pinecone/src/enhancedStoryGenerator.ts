// packages/client-pinecone/src/enhancedStoryGenerator.ts

import { StoryFormat, StoryTemplate, StoryStructure, STORY_FORMATS, StoryStructureBuilder } from './storyTemplates';

export class EnhancedStoryGenerator {
    constructor(
        private socialManager: SocialInteractionManager,
        private pineconeClient: any
    ) {}

    async generateLongformStory(
        participants: string[],
        template: StoryTemplate
    ): Promise<StoryStructure> {
        const context = await this.socialManager.generateStoryContext(participants);
        const characters = await this.buildCharacterDescriptions(participants);
        const format = STORY_FORMATS[template.format];

        // Generate story elements
        const story: StoryStructure = {
            title: await this.generateTitle(context, characters),
            introduction: await this.generateIntroduction(context, characters),
            chapters: await this.generateChapters(context, characters, format),
            conclusion: await this.generateConclusion(context, characters)
        };

        // Validate and adjust length if needed
        if (!StoryStructureBuilder.validateStoryLength(story, format)) {
            return await this.adjustStoryLength(story, format);
        }

        // Store the story
        await this.storeStory(story, participants);

        return story;
    }

    async generateTitle(context: any, characters: any[]): Promise<string> {
        // Generate an engaging title featuring character elements
        const mainCharacter = characters[0];
        return `${mainCharacter.username}'s Adventure in ${context.setting}`;
    }

    async generateIntroduction(context: any, characters: any[]): Promise<string> {
        // Create a compelling introduction that sets up the story
        const characterIntros = characters
            .map(c => `@${c.username}, ${this.describeCharacter(c)}`)
            .join('. ');

        return `In the realm of ${context.setting}, a new tale unfolds. 
                ${characterIntros}. Together, they embark on an epic journey...`;
    }

    async generateChapters(
        context: any,
        characters: any[],
        format: StoryFormat
    ): Promise<{ title: string; content: string; featuredCharacters: string[]; }[]> {
        const chapters = [];
        const chaptersNeeded = format.numChapters || 3;

        for (let i = 0; i < chaptersNeeded; i++) {
            // Select featured characters for this chapter
            const featuredChars = this.selectChapterCharacters(characters);
            
            chapters.push({
                title: await this.generateChapterTitle(i, context, featuredChars),
                content: await this.generateChapterContent(
                    i,
                    context,
                    featuredChars,
                    format.chapterLength
                ),
                featuredCharacters: featuredChars.map(c => c.username)
            });
        }

        return chapters;
    }

    async generateConclusion(context: any, characters: any[]): Promise<string> {
        // Create a satisfying conclusion that ties everything together
        return `And so, our heroes' journey comes to an end...`;
    }

    private selectChapterCharacters(characters: any[]): any[] {
        // Select a subset of characters to feature in each chapter
        return characters.slice(0, Math.max(2, Math.floor(Math.random() * characters.length)));
    }

    private describeCharacter(character: any): string {
        return `the ${character.traits.join(' and ')} ${character.role}`;
    }

    private async adjustStoryLength(story: StoryStructure, format: StoryFormat): Promise<StoryStructure> {
        // Implement length adjustment logic while maintaining story coherence
        // This could involve summarizing chapters, trimming descriptions, etc.
        return story;
    }

    private async storeStory(story: StoryStructure, participants: string[]) {
        const storyText = JSON.stringify(story);
        await this.pineconeClient.upsertVector(
            `story-${Date.now()}`,
            storyText,
            {
                type: 'longform_story',
                participants,
                timestamp: Date.now(),
                format: 'arena_thread'
            }
        );
    }

    async publishStory(story: StoryStructure, format: StoryFormat): Promise<string[]> {
        // Split the story into appropriate chunks for the platform
        return StoryStructureBuilder.splitForPlatform(story, format);
    }
}
