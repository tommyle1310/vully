# Capability: AI Assistant Routing Trace & Debugging

## Overview

A comprehensive tracing and debugging system that logs every routing decision, enabling admins to diagnose incorrect AI responses and optimize the orchestration system. Critical for production reliability and continuous improvement.

---

## ADDED Requirements

### Requirement: Complete Routing Trace Logging

The system MUST log every step of the query routing process for debugging and analysis.

#### Scenario: Full trace is logged for each query
**Given** a user submits a query  
**When** the query is processed through the orchestration system  
**Then** the following MUST be logged to `chat_queries` table:
  - `query`: Original user question
  - `intent`: Classified intent (BILLING_QUERY, POLICY_QUERY, etc.)
  - `intent_confidence`: Confidence score from classifier (0.0-1.0)
  - `cache_checked`: Whether cache was checked (boolean)
  - `cache_hit`: Whether cache returned a result (boolean)
  - `cache_verified`: Whether LLM verified cache hit (boolean)
  - `model_used`: Which model generated the response (groq/gemini/cache)
  - `tools_executed`: JSON array of SQL tools called
  - `routing_time_ms`: Time spent on classification + routing
  - `model_time_ms`: Time spent on LLM call
  - `total_time_ms`: End-to-end response time
  - `correlation_id`: UUID for request tracing
**And** the log entry MUST be created even if the query fails

#### Scenario: Routing decision is traceable
**Given** a query was misclassified as `SMALL_TALK` instead of `BILLING_QUERY`  
**When** an admin reviews the trace log  
**Then** they MUST be able to see:
  - The original query text
  - Why it was classified as `SMALL_TALK` (confidence score)
  - That no SQL tools were executed (wrong routing)
  - The response from Groq (which was inappropriate)
**And** this information MUST enable corrective action (prompt tuning, training data)

#### Scenario: Failed routing attempts are logged
**Given** a query triggers an error during intent classification  
**When** the system falls back to Gemini  
**Then** the trace MUST log:
  - `intent: "UNKNOWN"`
  - `intent_confidence: null`
  - `error_during_routing: true`
  - `fallback_used: "gemini"`
  - The error message
**And** the user MUST still receive a response

---

### Requirement: Admin Trace UI

Admins MUST have a web interface to inspect routing decisions and debug incorrect responses.

#### Scenario: Admin views trace for a specific query
**Given** an admin user  
**When** they navigate to `/admin/ai-trace`  
**Then** they MUST see a table of recent queries with columns:
  - Timestamp
  - User (anonymized or full based on permissions)
  - Query (truncated, expandable)
  - Intent + Confidence
  - Model Used
  - Response Time
  - Cache Hit
  - Status (success/error)
**And** clicking a row MUST expand full trace details

#### Scenario: Admin filters traces by intent
**Given** an admin wants to debug billing query accuracy  
**When** they filter by `intent = BILLING_QUERY`  
**Then** only queries classified as billing MUST be shown  
**And** they MUST be able to see:
  - Which SQL tools were called
  - The data returned by tools
  - The Groq synthesis prompt and response
  - User feedback (if available)

#### Scenario: Admin searches traces by query text
**Given** a user complained about wrong answer to "tiền điện tháng 3"  
**When** admin searches for "tiền điện tháng 3"  
**Then** all similar queries MUST be returned (fuzzy match)  
**And** the admin MUST see routing decisions for each occurrence  
**And** they CAN compare responses to identify inconsistencies

#### Scenario: Admin exports trace data for analysis
**Given** an admin needs to analyze 1000 queries  
**When** they click "Export to CSV"  
**Then** a CSV file MUST be generated with all trace columns  
**And** the export MUST complete within 10 seconds  
**And** the file MUST be downloadable

---

### Requirement: Real-Time Routing Metrics Dashboard

The system MUST provide real-time metrics on routing performance and accuracy.

#### Scenario: Dashboard shows intent distribution
**Given** an admin views the AI metrics dashboard  
**When** the page loads  
**Then** a pie chart MUST show:
  - % of queries by intent (BILLING, POLICY, SMALL_TALK, UNKNOWN)
  - Total queries in last 24 hours
  - Average confidence per intent
**And** the data MUST update every 60 seconds

#### Scenario: Dashboard shows model usage breakdown
**Given** an admin views the dashboard  
**Then** a bar chart MUST show:
  - Number of queries handled by Groq (synthesis)
  - Number of queries handled by Groq (direct)
  - Number of queries handled by Gemini
  - Number of cache hits
**And** cost estimate MUST be displayed per model

#### Scenario: Dashboard shows performance metrics
**Given** an admin views the dashboard  
**Then** the following MUST be displayed:
  - Average response time (p50, p95, p99)
  - Cache hit rate (%)
  - Intent classification accuracy (if feedback available)
  - Error rate (%)
**And** trends MUST be shown (last 7 days)

#### Scenario: Dashboard alerts on anomalies
**Given** the intent classifier starts failing  
**When** `UNKNOWN` intent exceeds 50% of queries for 1 hour  
**Then** a red alert banner MUST appear on the dashboard  
**And** the alert MUST show sample failed queries  
**And** an email notification MUST be sent to the engineering team

---

### Requirement: Correlation ID for Distributed Tracing

Every query MUST have a unique correlation ID that traces through all system components.

#### Scenario: Correlation ID is generated and propagated
**Given** a user sends a query  
**When** the request enters the AI assistant service  
**Then** a UUID correlation ID MUST be generated  
**And** the ID MUST be added to all log entries (Pino logger)  
**And** the ID MUST be passed to Groq/Gemini API calls (custom header)  
**And** the ID MUST be stored in `chat_queries.correlation_id`  
**And** the ID MUST be returned in the API response header `X-Correlation-ID`

#### Scenario: Admin can trace a query across services
**Given** an admin has a correlation ID from user complaint  
**When** they search for the correlation ID  
**Then** they MUST see:
  - All log entries with that correlation ID
  - External API calls (Groq/Gemini) with timing
  - Database queries executed
  - Cache lookup results
  - Final response sent to user
**And** this MUST enable end-to-end debugging

---

### Requirement: User Feedback Collection

Users MUST be able to provide feedback on AI responses to improve routing accuracy.

#### Scenario: User rates response as helpful
**Given** a user receives an AI response  
**When** they click thumbs up 👍  
**Then** the feedback MUST be stored with:
  - `chat_query_id`: Link to the query
  - `feedback_type`: "helpful"
  - `user_id`: Who gave feedback
  - `timestamp`: When
**And** the intent classification for that query MUST be marked as "confirmed correct"

#### Scenario: User rates response as unhelpful with reason
**Given** a user receives an incorrect response  
**When** they click thumbs down 👎 and select "Wrong information"  
**Then** the feedback MUST be stored with:
  - `feedback_type`: "unhelpful"
  - `reason`: "wrong_information"
  - Optional free text comment
**And** the query MUST be flagged for manual review  
**And** an admin MUST see it in the "Needs Review" queue

#### Scenario: Feedback is used to improve intent classifier
**Given** 100 queries classified as `BILLING_QUERY` with 80% thumbs down  
**When** an admin reviews the feedback  
**Then** they MUST be able to identify:
  - Common patterns in misclassified queries
  - Which queries should have been `POLICY_QUERY`
  - Whether the SQL tools are returning wrong data
**And** this MUST inform prompt tuning or training data collection

---

### Requirement: Routing Decision Replay

Admins MUST be able to replay a routing decision with different parameters to test improvements.

#### Scenario: Admin replays query with different intent
**Given** a query was classified as `SMALL_TALK` with confidence 0.60  
**When** admin manually changes intent to `BILLING_QUERY` and clicks "Replay"  
**Then** the system MUST re-process the query with forced intent  
**And** the new response MUST be generated using billing SQL tools  
**And** both responses (original vs replay) MUST be shown side-by-side  
**And** the admin CAN compare quality

#### Scenario: Admin tests new similarity threshold
**Given** an admin wants to tune cache verification threshold  
**When** they replay a query with threshold 0.90 instead of 0.95  
**Then** the system MUST show:
  - Which cached queries would match at 0.90
  - Whether LLM verification would pass
  - Potential false positive rate
**And** this enables data-driven threshold tuning

---

### Requirement: Automated Routing Quality Tests

The system MUST have automated tests to validate routing accuracy.

#### Scenario: Regression test suite runs nightly
**Given** a curated set of 100 test queries with expected intents  
**When** the nightly test suite runs  
**Then** each query MUST be classified  
**And** the accuracy MUST be calculated: `(correct_intents / total_queries) * 100`  
**And** if accuracy drops below 85%, an alert MUST be triggered  
**And** the failed queries MUST be logged for investigation

#### Scenario: Vietnamese terminology test cases
**Given** test queries include Vietnamese building management terms:
  - "Phí bảo trì 2% là gì?"
  - "Sổ hồng được cấp khi nào?"
  - "Đăng ký tạm trú như thế nào?"
**When** the test suite runs  
**Then** these MUST be classified as `POLICY_QUERY` with confidence ≥ 0.75  
**And** if any fail, the specific failures MUST be reported

---

## Related Capabilities

- **ai-assistant-intent-routing**: Provides routing decisions to trace
- **ai-assistant-semantic-cache**: Cache hits/misses are logged in trace
- **ai-assistant-multi-model**: Model selection is logged for debugging
