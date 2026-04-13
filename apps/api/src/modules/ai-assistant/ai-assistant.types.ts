/**
 * Query intent categories for AI assistant routing
 */
export enum QueryIntent {
  /** Billing, invoices, payments, balance queries */
  BILLING_QUERY = 'BILLING_QUERY',
  
  /** Building policies, rules, regulations */
  POLICY_QUERY = 'POLICY_QUERY',
  
  /** Action requests: create incident, pay invoice, etc */
  ACTION_REQUEST = 'ACTION_REQUEST',
  
  /** Greetings, thanks, small talk */
  SMALL_TALK = 'SMALL_TALK',
  
  /** Low confidence or unknown intent - fallback to comprehensive flow */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Intent classification result with confidence and extracted entities
 */
export interface IntentResult {
  /** Classified intent category */
  intent: QueryIntent;
  
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  
  /** Extracted entities from the query (optional) */
  entities?: {
    buildingName?: string;
    buildingId?: string;
    apartmentId?: string;
    dateRange?: [Date, Date];
    month?: number;
    year?: number;
  };
}

/**
 * Cached query response with metadata
 */
export interface CachedResponse {
  query: string;
  response: string;
  created_at: Date;
  similarity: number;
  cache_verified: boolean;
}

/**
 * SQL tool definition for safe structured queries
 */
export interface SqlTool {
  /** Unique tool identifier */
  name: string;
  
  /** Description for LLM to understand when to use */
  description: string;
  
  /** Expected parameters schema */
  parameters: Record<string, string>;
  
  /** MUST be true - enforces read-only operations */
  readonly: true;
  
  /** Execution function using Prisma (parameterized queries) */
  execute: (params: any, userId: string) => Promise<any>;
}

/**
 * Tool selection from LLM
 */
export interface ToolSelection {
  /** Name of the tool to execute */
  tool_name: string;
  
  /** Parameters to pass to the tool */
  parameters: Record<string, any>;
}

/**
 * Routing trace metadata for debugging
 * Aligns with chat_queries database schema fields
 */
export interface RoutingTrace {
  correlation_id: string;
  intent: string;
  intent_confidence: number | null;
  cache_checked: boolean;
  cache_hit: boolean;
  cache_verified: boolean;
  cache_similarity: number | null;
  model_used: string | null;
  tools_executed: string[] | null; // JSON array, null if no tools used
  routing_time_ms: number | null;
  model_time_ms: number | null;
  total_time_ms: number | null;
  error_during_routing: boolean; // Boolean in schema
  fallback_used: string | null; // VARCHAR(50) in schema
}
