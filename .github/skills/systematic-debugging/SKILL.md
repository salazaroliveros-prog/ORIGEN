---
name: systematic-debugging
description: "Investigate bugs, regressions, and validation issues with an evidence-first workflow. Use for root-cause analysis, reproducing failures, choosing a fix, and verifying completion before claiming a task is done."
---

# Systematic Debugging and Validation

## When to Use
- A bug, regression, or failing behavior must be reproduced and fixed
- Tests or manual checks fail and the root cause is unclear
- A change needs verification before calling it complete
- A quick patch would otherwise be guessed without evidence

## Core Principle
Do not patch blind. Start by proving the failure, tracing the likely source, testing one hypothesis at a time, and validating the smallest relevant proof before declaring success.

## Procedure

### 1. Reproduce the problem precisely
- Capture the exact symptom, inputs, environment, and user action
- Reduce to the smallest possible reproduction if the issue is broad
- Note whether the failure is deterministic or intermittent

### 2. Narrow the scope
- Identify the likely component, file, API, or layer involved
- Check recent relevant changes, logs, and configuration differences
- Separate product issues from environment or setup issues

### 3. Form a single working hypothesis
- State the most likely root cause in one sentence
- Prefer the explanation with the strongest evidence
- Avoid stacking unrelated guesses or broad refactors

### 4. Test the hypothesis with the smallest check
- Add or run the most targeted validation available
- Instrument the code or logs only as needed to confirm the cause
- If the hypothesis fails, discard it and form the next one

### 5. Implement the smallest correct fix
- Change only what is required to address the verified cause
- Keep the patch narrow and explainable
- Avoid unrelated cleanup while debugging

### 6. Verify the fix with evidence
- Re-run the exact repro or failing test
- Check the directly affected workflow and nearby coupled behavior
- Run the smallest relevant validation set, not necessarily the broadest suite

### 7. Review for regression risk
- Confirm the fix does not create obvious side effects
- Check shared logic, edge cases, and user-visible behavior
- Document assumptions, limitations, or follow-up work if needed

## Decision Points
- If the bug cannot be reproduced, gather more evidence before changing code
- If multiple causes seem plausible, prioritize the one supported by direct evidence
- If the issue touches shared infrastructure, validate adjacent flows before closing it
- If the failing condition is ambiguous, stop and instrument instead of guessing
- If a quick fix would hide the real cause, reject it and continue diagnosis

## Completion Checklist
Before claiming the issue is fixed, confirm all of the following:
- The behavior was reproduced or the failure mode was clearly identified
- The likely root cause was traced to a specific cause, not just a symptom
- The implemented fix is minimal and directly tied to the root cause
- The relevant verification passed with fresh evidence
- Any affected adjacent behavior was checked for obvious regression
- The final status is communicated with the proof, not just a claim

## Quality Bar
A task is complete only when the fix is backed by evidence, the root cause is understood, and the relevant verification matches the real user-facing behavior.
