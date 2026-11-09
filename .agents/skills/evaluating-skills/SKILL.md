---
name: evaluating-skills
description: Provides methods for evaluating skill output quality using eval-driven iteration to test whether skills produce good outputs.
---

Use this skill when users need to:
- Test whether a skill produces high-quality outputs
- Set up evaluation criteria for skill performance
- Implement eval-driven iteration for skill improvement
- Debug skills that aren't producing expected results

**Evaluation framework:**
1. **Define success criteria** - What makes a "good" output for this skill?
   - Correctness (accurate results)
   - Relevance (matches user intent)
   - Completeness (provides all needed information)
   - Format (proper output structure)

2. **Create test cases** - Develop a set of sample prompts that cover:
   - Typical use cases
   - Edge cases
   - Boundary conditions
   - Common user phrasings

3. **Run evaluations** - Execute the skill against test cases and record:
   - Activation success/failure
   - Output quality scores
   - Any errors or failures
   - User satisfaction indicators

4. **Analyze results** - Identify patterns:
   - Which prompts fail most often?
   - What types of errors occur?
   - Is the skill scope too broad or too narrow?
   - Are descriptions needing optimization?

5. **Iterate and improve** - Based on evaluation results:
   - Refine skill descriptions
   - Adjust skill body instructions
   - Update examples or edge case handling
   - Re-run evaluations to verify improvements

**Tools and techniques:**
- Use structured prompt templates for consistent testing
- Track results in a spreadsheet or evaluation database
- Consider automated testing if running many evaluations
- Document findings for future reference

Use this skill to establish quality gates for your Agent Skills and ensure they reliably produce valuable outputs for users.