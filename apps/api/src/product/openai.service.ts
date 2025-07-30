import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';

export interface LLMNormalizationRequest {
  rawName: string;
  merchant: string;
  itemCode?: string;
  context?: string;
}

export interface LLMNormalizationResponse {
  normalizedName: string;
  brand?: string;
  category?: string;
  confidenceScore: number;
  reasoning?: string;
}

export interface EmbeddingGenerationRequest {
  text: string;
  model?:
    | 'text-embedding-3-small'
    | 'text-embedding-3-large'
    | 'text-embedding-ada-002';
}

export interface EmbeddingGenerationResponse {
  embedding: number[];
  model: string;
  dimensions: number;
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly openai: OpenAI | null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'OpenAI API key not found. LLM normalization will be disabled.',
      );
      // Set to null when not configured
      this.openai = null;
    } else {
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
      this.logger.log('OpenAI service initialized successfully');
    }
  }

  /**
   * Check if OpenAI is properly configured
   */
  isConfigured(): boolean {
    return (
      this.openai !== null && !!this.configService.get<string>('OPENAI_API_KEY')
    );
  }

  /**
   * Normalize product name using OpenAI GPT-4.1-nano
   */
  async normalizeProductWithLLM(
    request: LLMNormalizationRequest,
  ): Promise<LLMNormalizationResponse> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI service is not properly configured');
    }

    const { rawName, merchant, itemCode, context } = request;

    this.logger.debug(`LLM normalization request: ${rawName} from ${merchant}`);

    try {
      const prompt = this.buildNormalizationPrompt(
        rawName,
        merchant,
        itemCode,
        context,
      );

      const completion = await this.openai!.chat.completions.create({
        model: 'gpt-4.1-nano',
        messages: [
          {
            role: 'system',
            content: `You are a product normalization expert. Your job is to convert cryptic receipt text into clean, standardized product names with proper capitalization and formatting.

Return ONLY a valid JSON object with these fields:
- normalizedName: Clean, readable product name
- brand: Brand name if identifiable (or null)
- category: Product category (or null) 
- confidenceScore: Number between 0-1 indicating confidence
- reasoning: Brief explanation of your decision

Example output:
{
  "normalizedName": "Organic Fuji Apples",
  "brand": "Organic",
  "category": "Produce",
  "confidenceScore": 0.9,
  "reasoning": "Clear product identification with organic modifier"
}`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1, // Low temperature for consistent results
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse the JSON response
      const parsedResponse = JSON.parse(
        responseText,
      ) as LLMNormalizationResponse;

      // Validate the response structure
      if (!parsedResponse.normalizedName) {
        throw new Error('Invalid response structure from OpenAI');
      }

      // Ensure confidence score is within valid range
      parsedResponse.confidenceScore = Math.max(
        0,
        Math.min(1, parsedResponse.confidenceScore || 0.5),
      );

      this.logger.debug(
        `LLM normalization result: ${parsedResponse.normalizedName} (confidence: ${parsedResponse.confidenceScore})`,
      );

      return parsedResponse;
    } catch (error) {
      this.logger.error(
        `OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error,
      );

      // Return fallback response on error
      return {
        normalizedName: rawName,
        confidenceScore: 0.3,
        reasoning: `Error during LLM processing: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Build a comprehensive prompt for product normalization
   */
  private buildNormalizationPrompt(
    rawName: string,
    merchant: string,
    itemCode?: string,
    context?: string,
  ): string {
    let prompt = `Normalize this receipt item:\n\n`;
    prompt += `Raw text: "${rawName}"\n`;
    prompt += `Store: ${merchant}\n`;

    if (itemCode) {
      prompt += `Item code: ${itemCode}\n`;
    }

    if (context) {
      prompt += `Context: ${context}\n`;
    }

    prompt += `\nTask: Convert this cryptic receipt text into a clean, readable product name. Consider:
- Remove abbreviations (ORG = Organic, LB = Pound, etc.)
- Fix capitalization (proper title case)
- Identify brand names if possible
- Determine product category
- Maintain accuracy - don't add information not implied by the text

Store context for ${merchant}:`;

    // Add store-specific context
    if (merchant.toLowerCase().includes('whole foods')) {
      prompt += `
- Known for organic and natural products
- Common abbreviations: ORG (Organic), FRZ (Frozen), WF (Whole Foods brand)`;
    } else if (merchant.toLowerCase().includes('walmart')) {
      prompt += `
- General merchandise retailer
- Common abbreviations: GV (Great Value brand), MM (Marketside)`;
    } else if (merchant.toLowerCase().includes('target')) {
      prompt += `
- General merchandise retailer  
- Common abbreviations: UP (Up brand), GG (Good & Gather)`;
    } else if (merchant.toLowerCase().includes('costco')) {
      prompt += `
- Warehouse club with bulk items
- Common abbreviations: KS (Kirkland Signature brand)`;
    }

    return prompt;
  }

  /**
   * Generate vector embedding for text using OpenAI
   */
  async generateEmbedding(
    request: EmbeddingGenerationRequest,
  ): Promise<EmbeddingGenerationResponse> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI service is not properly configured');
    }

    const { text, model = 'text-embedding-3-small' } = request;

    this.logger.debug(
      `Generating embedding for text: ${text.substring(0, 50)}...`,
    );

    try {
      const response = await this.openai!.embeddings.create({
        input: text,
        model: model,
      });

      const embedding = response.data[0].embedding;

      this.logger.debug(
        `Generated embedding with ${embedding.length} dimensions using model ${model}`,
      );

      return {
        embedding,
        model: model,
        dimensions: embedding.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(
    texts: string[],
    model:
      | 'text-embedding-3-small'
      | 'text-embedding-3-large'
      | 'text-embedding-ada-002' = 'text-embedding-3-small',
  ): Promise<EmbeddingGenerationResponse[]> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI service is not properly configured');
    }

    this.logger.debug(`Generating embeddings for ${texts.length} texts`);

    try {
      // OpenAI supports batch embedding generation
      const response = await this.openai!.embeddings.create({
        input: texts,
        model: model,
      });

      return response.data.map((data) => ({
        embedding: data.embedding,
        model: model,
        dimensions: data.embedding.length,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Test the OpenAI connection and configuration
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'OpenAI API key not configured' };
    }

    try {
      const testResponse = await this.openai!.chat.completions.create({
        model: 'gpt-4.1-nano',
        messages: [
          {
            role: 'user',
            content:
              'Respond with just the word "test" to verify the connection.',
          },
        ],
        max_tokens: 10,
        temperature: 0,
      });

      const response = testResponse.choices[0]?.message?.content
        ?.trim()
        .toLowerCase();

      if (response === 'test') {
        return { success: true };
      } else {
        return { success: false, error: `Unexpected response: ${response}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
