---
name: quickstart
description: guides users through creating their first Agent Skill and seeing it work in VS Code, from project setup to testing the skill.
---

Use this skill when the user wants to:
- Create their first Agent Skill from scratch
- Understand the skill creation workflow
- Set up skills in VS Code with GitHub Copilot
- Test and verify skills are working properly

**Quickstart workflow:**
1. Open your project in VS Code
2. Open the Copilot Chat panel
3. Select **Agent** mode from the mode dropdown
4. Type `/skills` to confirm skills appear in the list
5. Ask a question that matches a skill's description (e.g., "Roll a d20")
6. Allow the agent to run terminal commands if prompted
7. Verify the skill returns the expected result

**Skill creation fundamentals:**
- Skills are folders containing a `SKILL.md` file
- Place skills in `.agents/skills/` by default in VS Code
- The `name` field must match the folder name
- The `description` determines when the skill activates
- Skills use progressive disclosure — agents only load `name` and `description` initially

**Example: Creating a "roll-dice" skill**
- Folder: `.agents/skills/roll-dice/`
- File: `.agents/skills/roll-dice/SKILL.md`
- The skill body provides commands to roll dice (d6, d20, etc.)

Use this skill as a tutorial guide for new skill creators, or to refresh understanding of the creation workflow.