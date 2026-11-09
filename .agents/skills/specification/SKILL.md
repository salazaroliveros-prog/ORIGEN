---
name: specification
description: Provides the complete format specification for Agent Skills SKILL.md files, including all required and optional fields.
---

Use this skill when the user needs to understand or create Agent Skills following the official specification. The skill covers:

**Required fields:**
- `name` — Short identifier, must match the folder name
- `description` — Tells the agent when to use the skill
- The body — Instructions the agent follows when the skill activates

**Optional fields and features:**
- Variable definitions for reusable values (colors, fonts, sizes)
- Design tokens and styles
- Code Connect mappings for linking Figma nodes to code components
- Design system searches and component discovery
- Generative plugins and shaders creation
- Confluence and Jira integration skills

**Skill structure:**
Skills are progressive disclosure — agents only load `name` and `description` initially, then load the full body when matched to a prompt.

**Typical use cases:**
- Creating new skills from scratch
- Understanding skill format requirements
- Debugging skill activation issues
- Optimizing skill descriptions for reliable triggering

This skill helps agents and skill creators understand the complete specification for creating well-scoped, effective skills.