---
name: agent-skills-overview
description: Provides overview of Agent Skills system, documentation index, and how skills are discovered and activated by agents.
---

When an agent session starts, the agent scans default skill directories (typically `.agents/skills/`) and reads only the `name` and `description` from each skill's `SKILL.md` file. This progressive disclosure allows the agent to know when a skill might be relevant without loading all instructions up front.

Use this skill when the user asks about:
- Understanding the Agent Skills system
- Documentation index navigation
- How skills are discovered and activated
- Skill discovery mechanisms

The agent matches user prompts against skill descriptions to decide which skill to activate. Each skill's full body is then loaded into context for execution.