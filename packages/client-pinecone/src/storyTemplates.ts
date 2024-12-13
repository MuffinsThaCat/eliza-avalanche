// packages/client-pinecone/src/storyTemplates.ts

export interface StoryFormat {
    type: 'arena_thread' | 'tweet_thread' | 'discord_story';
    maxLength: number;
    chapterLength?: number;
    numChapters?: number;
}

export const STORY_FORMATS = {
    ARENA_LONG: {
        type: 'arena_thread',
        maxLength: 50000,  // Characters for full story
        chapterLength: 5000,  // Characters per chapter/post
        numChapters: 5
    },
    TWEET_SERIES: {
        type: 'tweet_thread',
        maxLength: 8000,  // Total characters for the thread
        chapterLength: 280,  // Standard tweet length
        numChapters: 20  // Maximum number of tweets in thread
    },
    DISCORD_EPIC: {
        type: 'discord_story',
        maxLength: 20000,  // Total story length
        chapterLength: 2000,  // Discord message limit
        numChapters: 10
    }
};

export interface StoryStructure {
    title: string;
    introduction: string;
    chapters: {
        title: string;
        content: string;
        featuredCharacters: string[];
    }[];
    conclusion: string;
}

export interface StoryTemplate {
    format: keyof typeof STORY_FORMATS;
    style: 'epic' | 'casual' | 'noir' | 'cyberpunk' | 'defi_drama';
    includeHashtags: boolean;
    includeMentions: boolean;
    structureType: 'linear' | 'nonlinear' | 'episodic';
    genreElements: string[];
}

export class StoryStructureBuilder {
    static createTemplate(format: keyof typeof STORY_FORMATS): StoryTemplate {
        return {
            format: format,
            style: 'epic',
            includeHashtags: true,
            includeMentions: true,
            structureType: 'linear',
            genreElements: ['adventure', 'drama', 'mystery']
        };
    }

    static validateStoryLength(story: StoryStructure, format: StoryFormat): boolean {
        const totalLength = [
            story.title,
            story.introduction,
            ...story.chapters.map(c => c.content),
            story.conclusion
        ].join('').length;

        return totalLength <= format.maxLength;
    }

    static splitForPlatform(story: StoryStructure, format: StoryFormat): string[] {
        const parts: string[] = [];
        
        // Add title and introduction
        parts.push(`${story.title}\n\n${story.introduction}`);

        // Split chapters according to platform limits
        story.chapters.forEach(chapter => {
            const chapterContent = `${chapter.title}\n\n${chapter.content}`;
            
            if (chapterContent.length <= format.chapterLength!) {
                parts.push(chapterContent);
            } else {
                // Split long chapters into multiple parts
                const chunks = this.splitTextIntoChunks(chapterContent, format.chapterLength!);
                parts.push(...chunks);
            }
        });

        // Add conclusion
        parts.push(story.conclusion);

        return parts;
    }

    private static splitTextIntoChunks(text: string, maxLength: number): string[] {
        const chunks: string[] = [];
        let start = 0;

        while (start < text.length) {
            let end = start + maxLength;
            
            // Find a good breakpoint (end of sentence or paragraph)
            if (end < text.length) {
                const breakpoints = [
                    text.lastIndexOf('. ', end),
                    text.lastIndexOf('! ', end),
                    text.lastIndexOf('? ', end),
                    text.lastIndexOf('\n', end)
                ];
                end = Math.max(...breakpoints.filter(bp => bp > start));
            }

            chunks.push(text.slice(start, end + 1).trim());
            start = end + 1;
        }

        return chunks;
    }
}
