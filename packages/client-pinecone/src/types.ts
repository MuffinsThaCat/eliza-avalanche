export interface VectorMetadata {
    type: string;
    timestamp: number;
    [key: string]: any;
}

export interface VectorQueryOptions {
    namespace?: string;
    filter?: Record<string, any>;
    topK?: number;
}
