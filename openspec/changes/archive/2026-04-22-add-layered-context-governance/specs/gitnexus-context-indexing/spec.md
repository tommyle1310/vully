# Capability: GitNexus Context Indexing

## ADDED Requirements

### Requirement: Context-First Indexing Priority
GitNexus indexing policy SHALL prioritize layered context docs for retrieval.

#### Scenario: Module-specific question
- **GIVEN** an AI query about a specific module
- **WHEN** retrieval runs
- **THEN** module `README.context.md` and `_module.md` are ranked ahead of broad code files
- **AND** retrieval returns targeted context with lower token usage

### Requirement: Deterministic Retrieval Order
The project SHALL define retrieval order for AI prompts that involve code changes or proposals.

#### Scenario: Agent prepares a proposal
- **GIVEN** a proposal task for a module
- **WHEN** the agent gathers context
- **THEN** it follows order: module docs -> `docs/api-contracts.md` -> `.project-context.md` -> code files
- **AND** includes additional code reads only after context docs are exhausted

### Requirement: Index Freshness Verification
The project SHALL include an operational check for GitNexus index freshness.

#### Scenario: Index becomes stale
- **GIVEN** repository changes after commit
- **WHEN** GitNexus reports stale index state
- **THEN** maintainers run index refresh workflow before relying on retrieval output
- **AND** document stale-index fallback in team guidance

### Requirement: Retrieval Validation by Representative Prompts
The team SHALL validate retrieval behavior using representative prompts across core modules.

#### Scenario: Retrieval quality verification
- **GIVEN** representative prompts for billing, apartments, incidents, and identity
- **WHEN** retrieval tests are executed
- **THEN** responses ground to module and contract docs before wide code scans
- **AND** false broad-context retrieval cases are recorded for tuning
