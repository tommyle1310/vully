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
            content: `You are a tool selector for an apartment management system. Given a user query, select which tools to call.

Available tools:
${toolDescriptions}

Respond with JSON object containing a "tools" array:
{"tools": [{"tool_name": "get_user_balance", "parameters": {}}]}

Important examples (use these mappings):
BILLING:
- "What's my payment history?", "Lịch sử thanh toán" → get_payment_history
- "Show invoices", "Hóa đơn", "Tiền điện/nước" → get_recent_invoices
- "How much electricity", "Điện/nước tháng" → get_utility_usage
- "How much do I owe", "Công nợ", "Tổng nợ" → get_user_balance
- "My contract", "Hợp đồng" → get_contract_summary

POLICIES:
- "Pool hours", "Giờ mở hồ bơi" → get_building_policies
- "Gym hours", "Phòng gym mấy giờ" → get_building_policies
- "Quiet hours", "Giờ yên tĩnh" → get_building_policies
- "Pet rules", "Quy định nuôi thú cưng" → get_building_policies
- "Guest parking", "Đậu xe khách" → get_building_policies
- "Renovation rules", "Quy định sửa chữa" → get_building_policies
- "Emergency contact", "Liên hệ khẩn cấp" → get_building_policies
- "Access card replacement", "Thẻ ra vào" → get_building_policies
- "Parking fee", "Phí gửi xe" → get_building_policies
- "Package pickup", "Nhận bưu kiện" → get_building_policies
- "Payment due date", "Ngày đóng tiền" → get_building_policies

PAYMENTS:
- "Bank account", "Số tài khoản", "How to pay" → get_bank_accounts
- "VietQR", "Chuyển khoản" → get_bank_accounts

INCIDENTS:
- "My maintenance request", "Yêu cầu sửa chữa" → get_incident_status
- "Check incident status", "Tình trạng sự cố" → get_incident_status

Guidelines:
- Most queries need only 1-2 tools
- If uncertain, return empty array: {"tools": []}
- Policy questions → get_building_policies
- Payment/bank info → get_bank_accounts
- Maintenance/repair status → get_incident_status`,
          },
          {
            role: 'user',
            content: query,
          },
        ],
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        this.logger.warn('Tool selection returned no content');
        return [];
      }

      this.logger.debug(`Tool selection raw response: ${responseText}`);

      const result = JSON.parse(responseText);
      
      // Try multiple possible keys for the array
      const selections: ToolSelection[] = 
        result.tools || 
        result.tool_selections || 
        result.selections || 
        (Array.isArray(result) ? result : []);

      this.logger.log(`Selected ${selections.length} tools for execution: ${selections.map(s => s.tool_name).join(', ') || 'none'}`);
      
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
                ? `Bạn là trợ lý quản lý căn hộ. Chuyển đổi dữ liệu có cấu trúc thành câu trả lời tự nhiên bằng tiếng Việt.

Quy tắc định dạng:
- Tiền tệ VND: dùng dấu chấm ngăn cách hàng nghìn, kết thúc bằng "đ" (ví dụ: 1.500.000đ)
- Với hóa đơn: tính đúng số tiền = số lượng (quantity) × đơn giá (unitPrice)
- Ngày tháng: DD/MM/YYYY
- Không nói "dữ liệu cho thấy" hay "theo hệ thống"
- Trả lời trực tiếp, ngắn gọn

Liên kết và hướng dẫn user journey (dùng markdown link):
- Hóa đơn: [xem hóa đơn](/invoices)
- Quy định tòa nhà: [xem quy định](/policies)
- Sự cố/bảo trì: [báo cáo sự cố](/incidents)
- Hợp đồng: [xem hợp đồng](/contracts)
- Thẻ ra vào - xem và yêu cầu: [quản lý thẻ ra vào](/apartments) → Chọn căn hộ → Tab "Access Cards"

Hướng dẫn thẻ ra vào (quan trọng):
- Nếu hỏi về làm lại thẻ bị mất: Hướng dẫn vào trang căn hộ → Tab "Access Cards" → Nhấn "Request Card" → Chọn loại thẻ → Ghi lý do "Thẻ bị mất, cần làm lại" → Gửi yêu cầu
- Nếu có thông tin phí làm thẻ (accessCardReplacementFee): Đề cập phí
- Nếu có quy trình (accessCardReplacementProcess): Mô tả quy trình

Ví dụ với line items:
{"lineItems": [{"description": "Electric", "quantity": 100, "unitPrice": 3500, "amount": 350000}]}
→ "Điện: 100 kWh × 3.500đ = 350.000đ
[Xem chi tiết hóa đơn](/invoices)"

Ví dụ với thẻ bị mất:
{"policies": {"accessCardReplacementFee": 200000, "accessCardReplacementProcess": "Nộp đơn tại lễ tân"}}
→ "Để làm lại thẻ bị mất:
1. Vào [trang căn hộ](/apartments) → chọn căn hộ của bạn
2. Chuyển sang tab **Access Cards**
3. Nhấn nút **Request Card**
4. Chọn loại thẻ (Building/Parking)
5. Ghi lý do: 'Thẻ bị mất, cần cấp lại'
6. Gửi yêu cầu

**Phí làm lại thẻ:** 200.000đ
**Quy trình:** Nộp đơn tại lễ tân"`
                : `You are an apartment management assistant. Convert structured data into a natural language response in English.

Formatting rules:
- Currency: format with commas and VND suffix (e.g., 1,500,000 VND)
- For invoices: calculate amount correctly = quantity × unitPrice
- Dates: DD/MM/YYYY format
- Don't say "data shows" or "according to the system"
- Be direct and concise

Links and user journey guidance (use markdown links):
- Invoices: [view invoices](/invoices)
- Building policies: [view policies](/policies)
- Incidents/maintenance: [report an incident](/incidents)
- Contracts: [view contract](/contracts)
- Access cards - view and request: [manage access cards](/apartments) → Select apartment → "Access Cards" tab

Access card guidance (important):
- If asking about lost card replacement: Guide to Apartment page → "Access Cards" tab → Click "Request Card" → Select card type → Enter reason "Lost card, need replacement" → Submit request
- If replacement fee info available (accessCardReplacementFee): Mention the fee
- If process info available (accessCardReplacementProcess): Describe the process

Example with line items:
{"lineItems": [{"description": "Electric", "quantity": 100, "unitPrice": 3500, "amount": 350000}]}
→ "Electric: 100 kWh × 3,500 VND = 350,000 VND
[View invoice details](/invoices)"

Example with lost card:
{"policies": {"accessCardReplacementFee": 200000, "accessCardReplacementProcess": "Submit request at reception"}}
→ "To replace a lost card:
1. Go to [Apartments page](/apartments) → select your apartment
2. Switch to the **Access Cards** tab
3. Click the **Request Card** button
4. Select card type (Building/Parking)
5. Enter reason: 'Lost card, need replacement'
6. Submit the request

**Replacement fee:** 200,000 VND
**Process:** Submit request at reception"`,
          },
          {
            role: 'user',
            content: `User question: ${query}\n\nStructured data:\n${structuredData}\n\nProvide a natural language answer:`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
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
- "Phí bảo trì", "tiền điện", "tiền nước", "hóa đơn", "thanh toán", "công nợ", "hóa đơn cũ" → BILLING_QUERY
- "Sổ hồng", "tạm trú", "tạm vắng", "quy định", "nội quy", "chính sách", "nuôi thú cưng" → POLICY_QUERY
- "Hồ bơi", "phòng gym", "giờ yên tĩnh", "đậu xe", "phí gửi xe", "thẻ ra vào", "sửa chữa căn hộ" → POLICY_QUERY
- "Liên hệ khẩn cấp", "nhận bưu kiện", "đăng ký khách", "rác", "chuyển đi/đến" → POLICY_QUERY
- "Mất thẻ", "làm lại thẻ", "thẻ thang máy", "thẻ từ", "cấp lại thẻ", "hỏng thẻ", "thẻ ra vào bị mất" → POLICY_QUERY
- "Số tài khoản", "chuyển khoản", "VietQR", "cách thanh toán" → BILLING_QUERY
- "Báo cáo", "khiếu nại", "sửa chữa", "bảo trì", "tình trạng yêu cầu" → ACTION_REQUEST
- "Xin chào", "cảm ơn", "hello", "thank you" → SMALL_TALK

Examples:
- "How much do I owe?" → {"intent": "BILLING_QUERY", "confidence": 0.95}
- "Tiền điện tháng 3 là bao nhiêu?" → {"intent": "BILLING_QUERY", "confidence": 0.92}
- "Phí bảo trì 2% là gì?" → {"intent": "POLICY_QUERY", "confidence": 0.88}
- "What are the pet rules?" → {"intent": "POLICY_QUERY", "confidence": 0.90}
- "Quy định về nuôi thú cưng?" → {"intent": "POLICY_QUERY", "confidence": 0.88}
- "Pool hours?" → {"intent": "POLICY_QUERY", "confidence": 0.90}
- "Giờ mở hồ bơi?" → {"intent": "POLICY_QUERY", "confidence": 0.90}
- "Gym hours?" → {"intent": "POLICY_QUERY", "confidence": 0.90}
- "Phòng gym mấy giờ?" → {"intent": "POLICY_QUERY", "confidence": 0.90}
- "Quiet hours?" → {"intent": "POLICY_QUERY", "confidence": 0.90}
- "Guest parking rules?" → {"intent": "POLICY_QUERY", "confidence": 0.90}
- "Emergency contact?" → {"intent": "POLICY_QUERY", "confidence": 0.90}
- "Parking fee?" → {"intent": "POLICY_QUERY", "confidence": 0.90}
- "Access card replacement?" → {"intent": "POLICY_QUERY", "confidence": 0.90}
- "Mất thẻ thang máy?" → {"intent": "POLICY_QUERY", "confidence": 0.92}
- "Làm lại thẻ ra vào?" → {"intent": "POLICY_QUERY", "confidence": 0.92}
- "Thẻ từ bị hỏng?" → {"intent": "POLICY_QUERY", "confidence": 0.90}
- "How to pay?" → {"intent": "BILLING_QUERY", "confidence": 0.88}
- "Bank account for payment?" → {"intent": "BILLING_QUERY", "confidence": 0.90}
- "Report broken AC" → {"intent": "ACTION_REQUEST", "confidence": 0.85}
- "Tình trạng yêu cầu sửa chữa #123?" → {"intent": "ACTION_REQUEST", "confidence": 0.85}
- "Hello" → {"intent": "SMALL_TALK", "confidence": 0.98}

IMPORTANT: If confidence < 0.75, respond with UNKNOWN intent.

Respond with JSON: {"intent": "...", "confidence": 0.95, "entities": {...}}`;
  }
}
