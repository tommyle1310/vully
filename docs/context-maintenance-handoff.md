# Context Maintenance and Ownership Handoff

## Ownership Model
- Root constitution (`.project-context.md`): Platform Architecture owner.
- API contracts (`docs/api-contracts.md`): Backend API owner with FE reviewer.
- Backend module docs (`_module.md`, `README.context.md`): domain module owner.
- Frontend context docs (`README.context.md` in app/components/hooks): frontend domain owner.

## Handoff Steps
1. Outgoing owner confirms docs are up to date in active domain.
2. Incoming owner reviews root constitution, contracts, and module docs.
3. Both owners run checklist in `docs/context-rollout-checklist.md`.
4. Ownership table in `docs/context-governance.md` is updated.

## Maintenance Cadence
- Per change: update relevant docs in same change set when contracts/flows change.
- Weekly: quick stale-scan on changed modules.
- Monthly: full governance review against current architecture and route map.
- Pre-release: mandatory pass for contracts and retrieval validation artifacts.
