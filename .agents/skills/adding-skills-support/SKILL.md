---
name: adding-skills-support
description: A guide for adding Agent Skills support to an AI agent or development tool, covering integration, discovery, and execution mechanisms.
---

Use this skill when developers want to:
- Add Agent Skills support to their AI agent or development tool
- Implement skill discovery and activation mechanisms
- Integrate skill execution into agent workflows
- Configure skill directories and discovery patterns

**Integration fundamentals:**
1. **Skill directory scanning** - Agent must scan `.agents/skills/` (or configured alternative) directories on startup
2. **Progressive disclosure** - Only load `name` and `description` initially, load full body when skill matches a prompt
3. **Description matching** - Agent compares user prompts against all skill descriptions to find matches
4. **Skill execution** - Once matched, load the skill's body and follow its instructions

**Implementation requirements:**
- Ability to read `.md` files from skill directories
- Progressive disclosure mechanism (load name/description first, full body on match)
- Prompt matching logic (string comparison or semantic matching against descriptions)
- Skill execution environment (terminal access, API calls, etc.)
- User permission handling for command execution

**Discovery patterns:**
- Default: `.agents/skills/` relative to project root
- Configurable: Alternative directories can be specified
- Recursive: Scan subdirectories for nested skills
- File filtering: Only process `.md` files with valid skill format

**Execution workflow:**
1. User submits prompt
2. Agent scans available skills
3. Agent matches prompt against skill descriptions
4. Matched skill's full body is loaded into context
5. Agent follows skill instructions
6. Result is returned to user

**Cross-agent compatibility:**
- Skills follow the open Agent Skills format
- Same skill works across compatible agents (Claude Code, OpenAI Codex, etc.)
- Description optimization ensures cross-model reliability
- Progressive disclosure works across different agent implementations

Use this skill as a reference for integrating Agent Skills support into new or existing agents, and for understanding how skills created in one context can be made available across the ecosystem.