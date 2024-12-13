export interface PineconeEnvironment {
    PINECONE_API_KEY: string;
    PINECONE_ENVIRONMENT: string;
    PINECONE_INDEX_NAME: string;
    OPENAI_API_KEY: string;
}

export function validatePineconeEnvironment(env: Partial<PineconeEnvironment>): boolean {
    const requiredVars: (keyof PineconeEnvironment)[] = [
        'PINECONE_API_KEY',
        'PINECONE_ENVIRONMENT',
        'PINECONE_INDEX_NAME',
        'OPENAI_API_KEY'
    ];
    
    return requiredVars.every(variable => !!env[variable]);
}
