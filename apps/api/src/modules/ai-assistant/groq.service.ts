import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { IntentResult, QueryIntent, ToolSelection, SqlTool } from './ai-assistant.types';

/**
 * Groq AI service for fast, cost-effective LLM operations
 * - Intent classification (Llama 3.1)
 * - Cache verification
 * - Billing data synthesis
 * - Small talk responses
 */
@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  private readonly groq: Groq;
  private readonly model = 'llama-3.1-8b-instant'; // 700 tokens/sec, $0.05/1M tokens
  private readonly confidenceThreshold = 0.75;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }
    this.groq = new Groq({ apiKey });
  }

  /**
   * Classify query intent using Llama 3.1
   * Returns UNKNOWN if confidence < 0.75 (triggers Gemini fallback)
   */
  async classifyIntent(query: string): Promise<IntentResult> {
    const startTime = Date.now();

    try {
      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.getIntentClassifierPrompt(),
          },
          {
            role: 'user',
            content: query,
          },
        ],
        temperature: 0.1,
        max_tokens: 100,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        this.logger.warn('Empty response from Groq intent classifier');
        return { intent: QueryIntent.UNKNOWN, confidence: 0 };
      }

      const result = JSON.parse(responseText) as {
        intent: string;
        confidence: number;
        entities?: any;
      };

      const classificationTime = Date.now() - startTime;
      this.logger.log(
        `Intent classified as ${result.intent} (confidence: ${result.confidence}) in ${classificationTime}ms`,
      );

      // CRITICAL: Check confidence threshold
      if (result.confidence < this.confidenceThreshold) {
        this.logger.warn(
          `Low confidence ${result.confidence} for query: "${query.substring(0, 50)}..." - defaulting to UNKNOWN`,
        );
        return {
          intent: QueryIntent.UNKNOWN,
          confidence: result.confidence,
          entities: result.entities,
        };
      }

      return {
        intent: result.intent as QueryIntent,
        confidence: result.confidence,
        entities: result.entities,
      };
    } catch (error) {
      this.logger.error(`Intent classification failed: ${(error as Error).message}`);
      // Fallback to UNKNOWN on error
      return { intent: QueryIntent.UNKNOWN, confidence: 0 };
    }
  }

  /**
   * Verify semantic equivalence between cached query and new query
   * Detects negation and semantic opposition (Vietnamese-aware)
   */
  async verifySementicEquivalence(cachedQuery: string, newQuery: string): Promise<boolean> {
    try {
      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'Are these two questions semantically equivalent? Pay special attention to negations (e.g., "đã đóng" vs "chưa đóng", "paid" vs "not paid"). Answer only YES or NO.',
          },
          {
            role: 'user',
            content: `Q1: ${cachedQuery}\nQ2: ${newQuery}`,
          },
        ],
        temperature: 0,
        max_tokens: 5,
      });

      const answer = completion.choices[0]?.message?.content?.trim().toUpperCase();
      const isEquivalent = answer === 'YES';

      this.logger.log(
        `Cache verification: "${cachedQuery}" vs "${newQuery}" => ${isEquivalent ? 'EQUIVALENT' : 'DIFFERENT'}`,
      );

      return isEquivalent;
    } catch (error) {
      this.logger.error(`Cache verification failed: ${(error as Error).message}`);
      // On error, treat as not equivalent (cache miss)
      return false;
    }
  }

  /**
   * Select which SQL tools to execute for a billing query
   */
  async selectTools(query: string, availableTools: SqlTool[]): Promise<ToolSelection[]> {
    try {
      const toolDescriptions = availableTools
        .map((t) => `- ${t.name}: ${t.description} (params: ${JSON.stringify(t.parameters)})`)
        .join('\n');

      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a tool selector. Given a user query, select which tools to call and with what parameters.

Available tools:
${toolDescriptions}

Respond with JSON array of tool selections:
[{"tool_name": "...", "parameters": {...}}]

If no tools are needed, return empty array: []`,
          },
          {
            role: 'user',
            content: query,
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        return [];
      }

      const result = JSON.parse(responseText);
      const selections: ToolSelection[] = result.tools || result.selections || [];

      this.logger.log(`Selected ${selections.length} tools for execution`);
      return selections;
    } catch (error) {
      this.logger.error(`Tool selection failed: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Synthesize natural language response from structured SQL data
   */
  async synthesize(
    query: string,
    structuredData: string,
    language: 'vi' | 'en' = 'vi',
  ): Promise<string> {
    try {
      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              language === 'vi'
                ? 'Bạn là trợ lý quản lý căn hộ. Chuyển đổi dữ liệu có cấu trúc thành câu trả lời tự nhiên bằng tiếng Việt. Giữ câu trả lời ngắn gọn và chính xác.'
                : 'You are an apartment management assistant. Convert structured data into a natural language response in English. Keep it concise and accurate.',
          },
          {
            role: 'user',
            content: `User question: ${query}\n\nStructured data:\n${structuredData}\n\nProvide a natural language answer:`,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      return completion.choices[0]?.message?.content || 'Unable to process query.';
    } catch (error) {
      this.logger.error(`Synthesis failed: ${(error as Error).message}`);
      return `Here is the data:\n\n${structuredData}`;
    }
  }

  /**
   * Handle small talk with direct Groq response
   */
  async handleSmallTalk(query: string, userName?: string): Promise<string> {
    try {
      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              "You are a friendly apartment management assistant. Respond naturally to greetings and small talk in Vietnamese or English based on the user's language. Keep responses brief and professional.",
          },
          {
            role: 'user',
            content: userName ? `User: ${userName}\nMessage: ${query}` : query,
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      });

      return completion.choices[0]?.message?.content || 'Xin chào! Tôi có thể giúp gì cho bạn?';
    } catch (error) {
      this.logger.error(`Small talk handling failed: ${(error as Error).message}`);
      return 'Xin chào! Tôi có thể giúp gì cho bạn?';
    }
  }

  /**
   * Intent classifier system prompt with Vietnamese terminology
   */
  private getIntentClassifierPrompt(): string {
    return `Classify user intent into one of: BILLING_QUERY, POLICY_QUERY, ACTION_REQUEST, SMALL_TALK, UNKNOWN.

Vietnamese terminology understanding:
- "Phí bảo trì", "tiền điện", "tiền nước", "hóa đơn", "thanh toán", "công nợ" → BILLING_QUERY
- "Sổ hồng", "tạm trú", "tạm vắng", "quy định", "nội quy", "chính sách", "nuôi thú cưng" → POLICY_QUERY
- "Báo cáo", "khiếu nại", "sửa chữa", "bảo trì" → ACTION_REQUEST
- "Xin chào", "cảm ơn", "hello", "thank you" → SMALL_TALK

Examples:
- "How much do I owe?" → {"intent": "BILLING_QUERY", "confidence": 0.95}
- "Tiền điện tháng 3 là bao nhiêu?" → {"intent": "BILLING_QUERY", "confidence": 0.92}
- "Phí bảo trì 2% là gì?" → {"intent": "POLICY_QUERY", "confidence": 0.88}
- "What are the pet rules?" → {"intent": "POLICY_QUERY", "confidence": 0.90}
- "Quy định về nuôi thú cưng?" → {"intent": "POLICY_QUERY", "confidence": 0.88}
- "Report broken AC" → {"intent": "ACTION_REQUEST", "confidence": 0.85}
- "Hello" → {"intent": "SMALL_TALK", "confidence": 0.98}

IMPORTANT: If confidence < 0.75, respond with UNKNOWN intent.

Respond with JSON: {"intent": "...", "confidence": 0.95, "entities": {...}}`;
  }
}
