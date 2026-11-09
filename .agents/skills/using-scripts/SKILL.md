---
name: using-scripts
description: Explains how to run commands and bundle executable scripts in Agent Skills, including terminal command execution and script integration.
---

Use this skill when users need to:
- Run terminal commands from within Agent Skills
- Bundle executable scripts with skills
- Execute platform-specific commands (bash, PowerShell, etc.)
- Handle command output and errors in skill bodies

**Command execution in skills:**
Skills can include instructions to run terminal commands. The agent follows these instructions when the skill activates.

**Platform-specific commands:**
- **Bash/Linux**: `echo $((RANDOM % <sides> + 1))` for dice rolling, or any bash command
- **PowerShell**: `Get-Random -Minimum 1 -Maximum (<sides> + 1)` for dice rolling
- **Cross-platform**: Skills should specify which platform their commands target

**Skill body considerations:**
- Commands are executed by the agent in its runtime environment
- The agent may ask for permission to run terminal commands
- Command output is returned to the user as part of the skill result
- Error handling should be included for failed commands

**Best practices:**
- Keep commands simple and focused on the skill's purpose
- Include error handling for command failures
- Test commands in the target environment before including in skills
- Consider security implications of command execution
- Provide clear descriptions of what commands will do

**Script bundling:**
- Skills can include references to external scripts
- Scripts should be accessible from the skill's location
- Ensure scripts have appropriate permissions
- Document script dependencies and requirements

Use this skill as a reference for integrating command execution and script running into Agent Skills, whether for dice rolling, code generation, design operations, or other capabilities.