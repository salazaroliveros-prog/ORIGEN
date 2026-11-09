---
name: best-practices
description: Provides best practices for skill creators on how to write skills that are well-scoped, calibrated, and effective for agent use.
---

Use this skill when creating or refining Agent Skills, focusing on:

**Skill scoping:**
- Keep skills focused and well-scoped to one capability
- Avoid creating overly broad skills that try to do too much
- Each skill should have a clear, single purpose

**Description optimization:**
- Write descriptions that clearly indicate when the skill should be used
- Include specific keywords that match common user prompts
- Test descriptions against likely user queries
- Use natural language that users would actually say

**Skill calibration:**
- Calibrate skill behavior to the task at hand
- Consider tool-use reliability variations across models
- Provide fallback behavior when tools don't execute as expected
- Allow model selection adjustments if skills aren't activating

**Structure and maintenance:**
- Keep skills under 20 lines when possible (like the roll-dice example)
- Use progressive disclosure to avoid loading unnecessary instructions
- Regularly evaluate skill output quality
- Update skills based on user feedback and changing requirements

**Common pitfalls to avoid:**
- Skills with vague descriptions that don't match user prompts
- Overly complex skills that try to handle multiple unrelated tasks
- Failing to test skill activation before deployment
- Ignoring model-specific tool-use reliability differences

Use this skill as a reference when writing new skills or improving existing ones to ensure they activate reliably and produce useful outputs.