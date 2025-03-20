/**
 * Generates embeddings for the given text using OpenAI's text-embedding model via our secure API
 * @param text The text to generate embeddings for
 * @returns A Promise that resolves to an array of numbers representing the embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error("Text cannot be empty");
    }

    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts: [text] }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate embedding');
    }

    const { embeddings } = await response.json();
    return embeddings[0];
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding");
  }
}

/**
 * Generates embeddings for multiple texts in batch via our secure API
 * @param texts Array of texts to generate embeddings for
 * @returns A Promise that resolves to an array of embeddings
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error("Texts array cannot be empty");
    }

    const validTexts = texts.filter(text => text && text.trim().length > 0);
    if (validTexts.length === 0) {
      throw new Error("No valid texts provided for embedding");
    }

    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts: validTexts }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate embeddings');
    }

    const { embeddings } = await response.json();
    return embeddings;
  } catch (error) {
    console.error("Error generating embeddings:", error);
    throw new Error("Failed to generate embeddings");
  }
}

/**
 * Calculates the cosine similarity between two embeddings
 * @param embedding1 First embedding vector
 * @param embedding2 Second embedding vector
 * @returns A number between -1 and 1, where 1 means most similar
 */
export function calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error("Embeddings must have the same length");
  }

  const dotProduct = embedding1.reduce((sum, value, i) => sum + value * embedding2[i], 0);
  const magnitude1 = Math.sqrt(embedding1.reduce((sum, value) => sum + value * value, 0));
  const magnitude2 = Math.sqrt(embedding2.reduce((sum, value) => sum + value * value, 0));

  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  return dotProduct / (magnitude1 * magnitude2);
} 