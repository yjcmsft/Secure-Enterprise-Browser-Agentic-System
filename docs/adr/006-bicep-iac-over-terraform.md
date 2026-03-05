# ADR-006: Bicep IaC over Terraform

**Status:** Accepted
**Date:** 2026-02-27
**Decision makers:** Engineering team

## Context

Infrastructure-as-Code is essential for repeatable deployments across dev, staging, and production. The two main options for Azure-native IaC are Bicep and Terraform.

## Decision

We chose **Bicep** for all infrastructure definitions.

## Alternatives considered

| Criteria | Bicep | Terraform |
|---|---|---|
| Azure-native | First-party, transpiles to ARM | Third-party provider |
| Learning curve | Low for Azure teams | Moderate (HCL syntax) |
| State management | Stateless (Azure tracks state) | Requires remote state backend |
| Module ecosystem | Azure-specific, growing | Massive, multi-cloud |
| CI/CD integration | `az bicep build` + `azd` built-in | Requires `terraform init/plan/apply` |
| Multi-cloud | Azure only | AWS, GCP, Azure, etc. |

## Consequences

**Positive:**
- Zero state file management — Azure Resource Manager tracks deployment state
- `azd` (Azure Developer CLI) natively understands Bicep — `azd provision` just works
- Modules are simple: 7 files in `infra/modules/`, each <40 lines
- Parameter files (`dev.bicepparam`, `staging.bicepparam`, `prod.bicepparam`) enable environment-specific configuration
- Bicep validation runs in CI via `az bicep build`

**Negative:**
- Azure-only — if we ever need multi-cloud, Terraform would be required
- Bicep linter warnings are verbose (e.g., `use-parent-property` for Cosmos containers)
- No equivalent of Terraform `plan` preview in CI (though `azd provision --preview` exists)

**Mitigation:** The modular structure means migrating individual resources to Terraform is straightforward if multi-cloud becomes a requirement.
