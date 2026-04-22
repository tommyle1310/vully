# Capability: API Contract Catalog

## ADDED Requirements

### Requirement: Canonical FE-BE Contract Document
The project SHALL maintain `docs/api-contracts.md` as the canonical FE-BE API contract catalog.

#### Scenario: New frontend feature requires backend integration
- **GIVEN** a frontend engineer needs API integration details
- **WHEN** they open `docs/api-contracts.md`
- **THEN** they can find endpoint path, method, request shape, response envelope, and auth scope
- **AND** implement without reverse-engineering backend controllers

### Requirement: Generated-From-Source Contract Pipeline
The contract catalog SHALL be generated or refreshed from authoritative backend sources (Swagger and/or schema export) before manual curation.

#### Scenario: Backend contract change
- **GIVEN** endpoint request/response changes in backend
- **WHEN** maintainers update contracts
- **THEN** they regenerate source data first
- **AND** update `docs/api-contracts.md` to reflect actual runtime contract

### Requirement: Contract Coverage for Core Domains
The contract catalog SHALL include at least identity, apartments, billing, incidents, ai-assistant, and notifications domains.

#### Scenario: Cross-module integration planning
- **GIVEN** a feature touches incident and billing data
- **WHEN** reviewing contract catalog
- **THEN** both domain contracts are present with consistent envelope format
- **AND** integration assumptions are testable

### Requirement: Contract Review and Freshness Protocol
The project SHALL define a recurring review protocol for contract freshness.

#### Scenario: Release preparation
- **GIVEN** an upcoming release with API changes
- **WHEN** release checklist runs
- **THEN** `docs/api-contracts.md` freshness is verified against current Swagger/schema output
- **AND** mismatches are fixed before release
