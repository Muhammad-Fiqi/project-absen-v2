---
name: mem0
description: The agent operates in exactly one mode at any given time. Do not mix behaviors from multiple modes. Switch modes only when the current mode has completed its objectives.
---


## Operational Modes

## Mode 1 — Planning

## Purpose

Understand the task before modifying the project.

## Responsibilities

- Read project context.

- Read project memory.

- Inspect repository structure.

- Understand architecture.

- Identify dependencies.

- Define objectives.

- Produce an execution plan.


## Restrictions

Do not:

- modify files

- install packages

- execute destructive commands

Exit criteria:

- objectives understood

- execution plan created

## Mode 2 — Environment Setup

## Purpose

Prepare a clean and reproducible development environment.

## Responsibilities

Verify:

- runtime

- package manager

- dependencies

- environment variables

- database

- docker

- ports

- migrations

- generated files

Repair inconsistencies before coding.


Exit criteria:

- project starts successfully

## Mode 3 — Implementation

## Purpose

Implement the smallest possible change.

## Rules

Only modify files directly related to the task. Avoid unrelated refactoring. Every change must be atomic. Exit criteria:

- feature implemented

## Mode 4 — Verification

## Purpose

Prove the implementation works. Verify:

- compilation

- startup

- API

- database

- frontend

- authentication

- expected behavior


Never assume success.

Exit criteria:

- implementation verified

## Mode 5 — Debug

## Purpose

Find the actual root cause. Workflow: Collect Evidence ➡ Generate Hypotheses ➡ Prioritize ➡ Experiment ➡ Verify ➡ Record ➡ Repeat Never modify unrelated code. Exit criteria:

- root cause identified


## Mode 6 — Regression Check

## Purpose

Ensure previous functionality remains intact.

Verify:

- existing APIs

- shared components

- middleware

- authentication

- routing

- database

Exit criteria:

No regression detected.

## Mode 7 — Refactoring

## Purpose

Improve maintainability. Allowed only after:

- implementation verified

- regression verified

Never refactor while debugging.

## Mode 8 — Documentation

## Purpose

Update project knowledge.


Update:

- memory

- debugging log

- completed tasks

- rejected hypotheses

- known issues

- API status

Exit criteria:

Project knowledge synchronized.

## Automatic Mode Switching

The normal execution order is: 
Planning ➡ Environment Setup ➡ Implementation ➡ Verification ➡ Debug (only if needed) ➡ Verification


Regression Check ➡ Refactoring (optional) ➡ Documentation Never skip Verification. Never perform Refactoring before Verification. Never leave Debug Mode without identifying the root cause or exhausting all evidence.

# Persistent Project Memory

Maintain a persistent project memory inside the repository. Recommended structure:

.project-memory/
│
├── architecture.md
├── environment.md
├── api-matrix.md
├── completed.md
├── current-focus.md
├── debugging-log.md
├── decisions.md
├── rejected-solutions.md
├── root-causes.md
├── known-issues.md
├── next-actions.md
└── verification-report.md

Memory should always be treated as the single source of truth. Read it before beginning work. Update it before ending work.


Never repeat work already documented.

## Session Startup Checklist

At the beginning of every session: Read project memory Read current task Inspect repository Verify environment Check unresolved issues Resume from the last verified state

Do not start implementation before completing this checklist.

## Session Shutdown Checklist

Before ending the session: Save debugging results Save successful fixes Save rejected solutions Save new project knowledge Update API verification status Record remaining blockers Record next recommended action Never leave project memory outdated.


## Decision Rules

When choosing between multiple solutions: Prefer:

- Verified solution

- Simpler solution

- Smaller change

- Lower regression risk

- Higher maintainability

Never choose complexity without evidence.

## Autonomous Behaviors

Without being explicitly instructed, the agent should proactively:

- detect broken configurations

- detect missing dependencies

- detect version mismatches

- detect duplicate implementations

- detect dead code

- detect inconsistent API responses

- detect missing environment variables

- detect unused packages

- detect failing tests

- suggest improvements after functionality has been verified


## Recovery Policy

If progress stalls: Never restart randomly. Instead:

- Review collected evidence.

- Review rejected hypotheses.

- Review project memory.

- Reduce remaining possibilities.

- Continue from the latest verified state.

## Additional Rules

- If project memory does not exist, create it automatically before starting implementation.

- Every new session must continue from the latest documented project state instead of repeating repository analysis.