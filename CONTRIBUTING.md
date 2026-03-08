# Contributing

Thanks for your interest in improving the Secure Enterprise Browser Agentic System!

## Quick Start

```bash
git clone https://github.com/yjcmsft/Secure-Enterprise-Browser-Agentic-System.git
cd Secure-Enterprise-Browser-Agentic-System
npm install
npm test          # 456 tests should pass
npm run dev       # http://localhost:3000
```

## Development Workflow

1. **Fork** the repo and create a feature branch
2. **Write tests** for any new functionality (we maintain 92%+ coverage)
3. **Run the full check** before submitting:
   ```bash
   npm run lint && npm run typecheck && npm test
   ```
4. **Submit a PR** against `main`

## Adding a New Skill

The agent's skill architecture is designed for extensibility. To add a new target application:

### 1. Create the skill handler

```typescript
// src/skills/my-new-skill.ts
import type { SkillExecutionContext, SkillResult } from "../types/skills.js";

export async function myNewSkill(
  params: Record<string, unknown>,
  context: SkillExecutionContext,
): Promise<SkillResult> {
  // Your skill logic here — use runtime.securityGate.executeWithSecurity()
  // to get URL allowlist, content safety, and audit logging for free.
  return {
    skill: "my_new_skill",
    success: true,
    data: { /* result */ },
    path: "api", // or "dom"
    durationMs: Date.now() - startedAt,
  };
}
```

### 2. Register it in the skill registry

```typescript
// src/skills/index.ts — add to the registry
import { myNewSkill } from "./my-new-skill.js";

const registry: Record<SkillName, SkillHandler> = {
  // ... existing skills
  my_new_skill: myNewSkill,
};
```

### 3. Add the type to SkillName

```typescript
// src/types/skills.ts
export type SkillName =
  | "navigate_page"
  // ... existing skills
  | "my_new_skill";
```

### 4. Register as a Foundry function tool

```typescript
// src/foundry-agent.ts — add to functionTools[]
{
  type: "function",
  function: {
    name: "my_new_skill",
    description: "What my skill does",
    parameters: { type: "object", properties: { /* ... */ } },
  },
}
```

### 5. Register as a Copilot SDK tool

```typescript
// src/copilot-sdk.ts — add to createBrowserTools()
skill(
  "my_new_skill",
  "What my skill does",
  z.object({ /* Zod schema */ }),
),
```

### 6. Add URL patterns (if needed)

```
# url-allowlist.txt
https://your-app.example.com/*
```

### 7. Write tests

```
tests/unit/skills/my-new-skill.test.ts
```

## Code Standards

- TypeScript strict mode
- ESLint + Prettier formatting
- Every security layer is feature-flag gated
- All skills go through `SecurityGate.executeWithSecurity()`
- Immutable audit trail for every action

## Project Structure

```
src/skills/       → Skill handlers (add yours here)
src/security/     → 5-layer pipeline (don't bypass this)
src/api/          → REST/GraphQL connectors + bot detection
src/graph/        → Microsoft Graph integrations
src/types/        → TypeScript type definitions
tests/            → Unit + integration + E2E tests
```

## Questions?

Open a [Discussion](https://github.com/yjcmsft/Secure-Enterprise-Browser-Agentic-System/discussions) or file an [Issue](https://github.com/yjcmsft/Secure-Enterprise-Browser-Agentic-System/issues).
