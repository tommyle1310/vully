# Capability: AI Assistant

## ADDED Requirements

### Requirement: RAG-based Q&A
The system SHALL provide AI-powered answers using building regulations and FAQ documents.

#### Scenario: Query with context
- **GIVEN** an authenticated Resident with a question
- **WHEN** POST to `/api/ai/query` with question text
- **THEN** the system retrieves relevant documents via vector search
- **AND** constructs prompt with context
- **AND** returns LLM-generated answer

#### Scenario: No relevant documents
- **GIVEN** a question with no matching documents
- **WHEN** query is processed
- **THEN** the system returns a polite response indicating limitation
- **AND** suggests contacting admin

---

### Requirement: Document Management
The system SHALL allow administrators to manage knowledge base documents.

#### Scenario: Upload document
- **GIVEN** an authenticated Admin
- **WHEN** POST to `/api/ai/documents` with document content
- **THEN** document is processed into chunks
- **AND** embeddings are generated and stored

#### Scenario: Document categories
- **GIVEN** document management
- **WHEN** categorizing documents
- **THEN** valid categories include: regulations, faq, lease-terms, maintenance-guides

#### Scenario: Delete document
- **GIVEN** an Admin and existing document
- **WHEN** DELETE `/api/ai/documents/:id`
- **THEN** document and its embeddings are removed
- **AND** subsequent queries no longer retrieve it

---

### Requirement: Query Rate Limiting
The system SHALL protect AI endpoint from abuse.

#### Scenario: Rate limit enforcement
- **GIVEN** a user sending many queries
- **WHEN** exceeding 10 queries per minute
- **THEN** the system returns 429 Too Many Requests
- **AND** includes retry-after header

#### Scenario: Admin bypass
- **GIVEN** an Admin user
- **WHEN** querying AI endpoint
- **THEN** higher rate limits apply (50 per minute)

---

### Requirement: Response Quality
The system SHALL provide relevant and accurate answers.

#### Scenario: Source attribution
- **GIVEN** AI response uses document context
- **WHEN** returning answer
- **THEN** response includes source document references

#### Scenario: Confidence indication
- **GIVEN** AI query processing
- **WHEN** relevance score is low
- **THEN** response includes disclaimer about uncertainty
