# AI Task Catalog

MediPilot AI uses consistent names for every AI workflow. Each output remains an `AI draft, doctor review required.` The doctor can review, edit, approve, reject, or apply supported drafts from the AI Review queue.

| Internal type | User-facing draft name | Output purpose |
| --- | --- | --- |
| `CONSULTATION_SUMMARY` | AI consultation summary draft | Generalizes rough doctor bullets into a clinician-facing summary with uncertainties and missing follow-up items. |
| `SOAP_NOTE` | AI SOAP note draft | Structures provided context into Subjective, Objective, Assessment, and Plan without inventing facts. |
| `HISTORY_TIMELINE` | AI patient history timeline draft | Summarizes patient history and recurring clinical themes chronologically. |
| `DOCUMENT_PARSE` | AI document parsing draft | Extracts labs, dates, medications, abnormal values, and follow-up needs from uploaded report text. |
| `FOLLOW_UP_INSTRUCTIONS` | AI follow-up instruction draft | Drafts clear follow-up steps and patient instructions from the note. |
| `TASK_EXTRACTION` | AI clinic task extraction draft | Extracts operational tasks, priorities, and rationale for clinic staff. |
| `RISK_FLAG_EXPLAINER` | AI risk flag explanation draft | Explains missed follow-ups, abnormal values, or important keywords for doctor review. |
| `VISIT_SUMMARY` | AI patient-friendly visit summary draft | Turns clinical notes into plain-language patient-facing wording. |
| `REFERRAL_LETTER` | AI referral letter draft | Drafts specialist referral wording with context, findings, and missing send-ready items. |
| `ASSISTANT_RESPONSE` | AI patient-context answer draft | Answers a doctor question using selected patient context and citations. |
| `SEMANTIC_SEARCH` | AI semantic search summary draft | Summarizes relevant note and document matches for a clinical query. |

## Review Flow

1. A doctor or clinic admin generates a named AI draft from the dashboard, consultation page, document page, patient chart, schedule, tasks, or AI Assistant.
2. The app stores the draft with provider, model, prompt version, source context, timestamp, request ID, and review status.
3. The readable draft is shown with the task-specific title and clinical sections.
4. The AI Review queue keeps editable JSON under `Corrected AI draft JSON`.
5. The reviewer can correct the draft, approve only, approve and apply to the supported record, or reject it with a note.
