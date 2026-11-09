---
name: optimizing-descriptions
description: Tests and improves skill descriptions so they trigger reliably on relevant prompts, including evaluation and iteration strategies.
---

Use this skill when users want to:
- Improve an existing skill's description for better activation
- Test which descriptions work best for specific prompt types
- Evaluate skill trigger reliability across different models
- Optimize descriptions using data-driven iteration

**Description testing approach:**
1. Start with a baseline description
2. Test against a variety of user prompts related to the skill's purpose
3. Measure activation rate (percentage of prompts that correctly trigger the skill)
4. Refine description based on test results
5. Repeat until activation rate is acceptable

**Key optimization factors:**
- **Keyword inclusion**: Include terms users commonly use for the skill's function
- **Specificity balance**: Descriptions should be specific enough to match right prompts, but not so specific they miss related use cases
- **Natural language**: Use phrasing that matches how users actually ask for the capability
- **Model consideration**: Different models may interpret descriptions differently; test across target models

**Evaluation methods:**
- Manual testing with sample prompts
- Automated testing scripts that query the agent with varied prompts
- Tracking activation rates over time
- A/B testing different description variants

**Iterative improvement cycle:**
1. Create initial description
2. Test with 20-30 sample prompts
3. Identify patterns of missed activations or false positives
4. Revise description based on findings
5. Re-test and monitor activation rates
6. Document effective description patterns for reuse

Use this skill to improve the reliability of skill activation across your agent ecosystem.