# Layered Context Rollout Checklist

## Pre-rollout
- [ ] `.project-context.md` exists and reflects current stack versions.
- [ ] `docs/api-contracts.md` generated from latest Swagger JSON and curated.
- [ ] Backend modules include `_module.md` and `README.context.md`.
- [ ] Frontend groups include colocated `README.context.md` docs.

## Validation
- [ ] OpenSpec strict validation passes.
- [ ] Module docs are consistent with contracts and root constitution.
- [ ] Retrieval validation prompts pass for billing/apartments/incidents/identity.
- [ ] Stale-index recovery instructions are documented.

## Ownership and Maintenance
- [ ] Domain owners confirmed for each backend module.
- [ ] SLA expectations documented and acknowledged.
- [ ] Monthly review slot assigned.
- [ ] Release checklist includes context doc freshness checks.
