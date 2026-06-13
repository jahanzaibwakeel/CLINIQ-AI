# AI Workflow

## Provider Strategy

Default mode is local Ollama:

```env
AI_PROVIDER=ollama
OLLAMA_HOST=localhost
OLLAMA_HOST_PORT=11434
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_NUM_PREDICT=220
ALLOW_EXTERNAL_AI=false
```

Adapters exist for Groq and Gemini, but they throw unless `ALLOW_EXTERNAL_AI=true` and the relevant API key is configured. This prevents accidental PHI transfer to external services.

For a no-cost clinic demo, use Ollama with an open-weight local model. The default is `qwen2.5:7b`, which is a practical free model for clinical note drafting, summarization, and structured JSON extraction on ordinary developer hardware. If the machine has less memory, switch to a smaller Ollama model and keep the same provider interface.

## AI Modules

MediPilot AI implements these generation types:

- `CONSULTATION_SUMMARY`
- `SOAP_NOTE`
- `HISTORY_TIMELINE`
- `DOCUMENT_PARSE`
- `FOLLOW_UP_INSTRUCTIONS`
- `TASK_EXTRACTION`
- `RISK_FLAG_EXPLAINER`
- `VISIT_SUMMARY`
- `REFERRAL_LETTER`
- `ASSISTANT_RESPONSE`
- `SEMANTIC_SEARCH`

## Embedded AI Flows

AI is integrated into everyday workflow surfaces:

- Dashboard: rough daily bullets to summaries, tasks, follow-ups, and visit summaries.
- Consultations: encounter notes to SOAP, consultation summary, task extraction, follow-up instructions, and patient-friendly summary.
- Patient detail: history timeline, risk explanation, referral draft, visit summary, and context Q&A.
- Documents: report parsing, abnormal-value explanation, follow-up drafting, and patient-friendly document summary.
- Document upload pipeline: every uploaded extracted-text report is chunked, embedded, then sent through document parse, risk flag explanation, and task extraction drafts for review.
- Document intelligence: reviewed parsed JSON, AI document-parse drafts, and lightweight text-scanned lab values are normalized into a parsed-value review board for clinician approval.
- Tasks: current queue or pasted notes to extracted tasks, follow-up language, and operational risk review.

Prompt templates live in `lib/ai/prompts.ts` and include stable version IDs.

Structured AI JSON is rendered back to clinicians as readable summaries, SOAP sections, task lists, patient instructions, flags, referral text, and extracted document details. Raw JSON is kept for validation, storage, audit, and controlled review edits rather than being the default display format.

## Guardrails

All prompts instruct the model to:

- Avoid final diagnosis language.
- Use only provided context.
- Mark output as an AI draft.
- Return structured JSON.
- Identify missing information instead of inventing facts.

`parseSafeAiOutput()` enforces the exact disclaimer: `AI draft, doctor review required.`

## Fallbacks

If the configured AI provider is unavailable, MediPilot returns a conservative structured fallback. It does not infer clinical conclusions. This makes demos reliable and prevents broken workflows.

## Runtime Status

Signed-in users can call `/api/ai/status` or open Settings to confirm whether the configured runtime is ready. For Ollama, MediPilot checks `/api/tags`, confirms the configured model is installed, and reports whether the app is using local AI, a missing local model, an unreachable local service, an external provider, or safe fallback mode.

## Semantic Search

Document text is chunked and embedded. Ollama embeddings are used when available; otherwise a deterministic local hash embedding supports offline demos. Search ranks chunks by cosine similarity.

## Audit and Review

Each AI generation records:

- provider
- model
- prompt version
- request ID
- latency in milliseconds
- cache-hit state
- rough token estimate
- timestamp
- source context preview
- external AI policy state
- raw output when available
- structured output
- review status

Creation is also captured in `AuditLog`.

Clinic admins can inspect AI reliability and review pressure from `/ops`, including fallback usage, cache hit rate, document triage volume, and recent request traces.
