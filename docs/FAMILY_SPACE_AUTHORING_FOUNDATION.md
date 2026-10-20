# Family Space — agent-ready authoring foundation (v1)
Status: foundational contract, **NOT** a deployed builder or a secure learning backend.
Governed by `docs/GRADE_SPACE_AGENT_GUARDRAILS.md` and `docs/AGENT_GRADE_SPACE_BOUNDARIES.md`.

## Intent
Provide two distinct first-class authoring aggregates: **question** and **assignment/workbook**. AI and humans use the same declarative, versioned JSON shape and pure validation functions. Neither authoring path requires choosing a grade or question type from an exhaustive dropdown.

## Agent workflow
1. Human gives a natural-language brief; agent generates a **proposal** conforming to schemaVersion `family-authoring/1`.
2. Validate proposal structurally and semantically; surface exact field-path errors; never write a malformed proposal.
3. Preview complete workbook organization (sections, category labels, question order, multi-part prompts, response controls) and answer key only in the *authoring* context.
4. Human can edit question independently or assemble assignment sections using referenced question ids/revisions or snapshots.
5. Human explicitly approves the draft before publishing; publishing produces immutable question/assignment versions. Proposals never auto-publish.
6. Future provider adapter: only selected context transmitted with consent, no child PII, API key server-side, costs/rate limits guarded. Do not connect an LLM in this stage.

## Contract
Question: `{schemaVersion,id,revision,title,prompt,subject,tags,parts:[{id,prompt,kind,options?,answerSpec?,rubric?}]}`.
Kinds: `single_choice`, `multi_choice`, `short_text`, `number`, `long_text`. Parts are individual answer targets; compound questions can mix response kinds. `answerSpec` belongs to privileged authoring/server evaluation data, never learner projection. Descriptive work may require human review; no speculative auto-scoring.

Assignment: `{schemaVersion,id,revision,title,instructions,sections:[{id,title,category?,instructions?,items:[{id,questionId,questionRevision,questionSnapshot}]}]}`. Section order and item order are meaningful. Snapshots lock the exact question delivered. Assignment requires at least one section and one question total.

For agent proposals: `{schemaVersion,kind:"question"|"assignment",draft}`. Each proposal validates with the exact same domain module as the human builder. Human/agent create and edit using draft state; system validates at publication boundary. No direct SQL or browser DOM mutations from generated model output.

## Non-negotiables
- Stable IDs and revisions. Duplicate IDs rejected within an aggregate; assignment item refs must match question snapshots.
- Never derive correctness from answer strings in a browser; answer specs and rubrics stay private.
- Server remains grading authority; explainability, review status, confidence are stored separately from student submitted answers.
- Future AI grading produces *suggestions/evidence*, not automatic final grades for descriptive answers without approved policy and human oversight.
- Never send family identity, responses, or student data to AI providers without explicit family administrator permission.
- This foundation does not grant access, save data across devices, create Supabase tables, or authorize a production release.

## Bounded milestones
- F0 (this PR): validated versioned question/workbook contracts, learner-safe projection, tests.
- F1: ergonomic Question Builder and Workbook Builder consuming these contracts, reusable library, human preview.
- F2: safe AI proposal adapter and approval queue; input and output size limits, structured-output validation, retry/fallback, budgets.
- F3: secured database persistence and protected versioning after dedicated project and RLS approval.
- F4: evidence-backed grading pipeline and parent review, including manual review paths.
Each milestone has independent tests; F0 must not be described as F1-F4.

## Adversarial pass to apply before merging
Try empty sections, duplicate IDs, question reference mismatch, unsupported kinds, missing options, malformed answer keys, contradictory answers, long untrusted agent text, child-visible projections containing keys, partial AI output, prompt injection embedded in text, multi-part questions, and nested categories. Reject invalid structures with field-path diagnostics. Preserve game engine unchanged.
