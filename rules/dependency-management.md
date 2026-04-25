---
name: dependency-management
description: "Adding, updating, auditing, and removing dependencies"
version: "4.0"
enforcement: mandatory
human_override: "User can override with explicit justification documented in decisionLog.md"
---

# Rule: Dependency Management

## R1: Before Adding a Dependency

Evaluate every new dependency against:

| Criteria | Check |
|----------|-------|
| Necessity | Can this be done in < 50 lines without a library? |
| Maintenance | Last commit < 6 months? Active issues responded to? |
| Popularity | > 1000 weekly downloads? |
| Size | What does it add to bundle? (`bundlephobia.com`) |
| Security | Any open CVEs? (`npm audit`) |
| License | Compatible with project license? (MIT, Apache OK; GPL check) |

If library fails ≥ 2 criteria → don't add, write it yourself or find alternative.

## R2: Lock Files

- Always commit `package-lock.json` / `pnpm-lock.yaml`
- Use `npm ci` (not `npm install`) in CI for deterministic builds
- Never manually edit lock files

## R3: Version Pinning

- Pin major versions: `"express": "^4.18.2"` (allow minor updates)
- For critical deps (auth, crypto): pin exact: `"bcrypt": "5.1.1"`
- Renovate/Dependabot for automated update PRs

## R4: Auditing

- Run `npm audit` / `pip audit` weekly and in CI
- CRITICAL/HIGH vulnerabilities: fix within 48h or document workaround
- MEDIUM: fix within 1 sprint
- LOW: fix when convenient

## R5: Removal

- Unused dependency identified → remove immediately
- Tools: `depcheck` (Node.js), `vulture` (Python)
- Remove from package.json AND lock file (run `npm install` after)

## Verification

- Automated: `npm audit` in CI, Dependabot/Renovate configured
- Review: decisionLog.md entry required for any new dependency

## Related

- Agent: `agents/security-auditor.md` (dependency audits)
- Quality gate: security gate in `manifests/quality-gates.yaml`