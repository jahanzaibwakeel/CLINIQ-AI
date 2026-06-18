import type { AiCompletionRequest, AiCompletionResponse, AiProvider, SafeAiOutput } from "@/lib/ai/types";

const disclaimer = "AI draft, doctor review required." as const;

type Finding = {
  label: string;
  value: string;
  status: "abnormal" | "pending" | "mentioned";
  source: string;
};

export class FallbackProvider implements AiProvider {
  name = "fallback" as const;
  model = "local-clinical-rules-v2";

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const sourceText = extractSection(request.user, "Source text") || request.user;
    const patientContext = extractSection(request.user, "Patient context");
    const task = extractSection(request.user, "Task");
    const question = extractDoctorQuestion(request.user);
    const output = buildDraft({ sourceText, patientContext, task, question });

    return {
      provider: this.name,
      model: this.model,
      usedFallback: true,
      text: JSON.stringify(output)
    };
  }

  async embed(input: string) {
    return hashEmbedding(input);
  }
}

function buildDraft(input: {
  sourceText: string;
  patientContext: string;
  task: string;
  question?: string;
}): SafeAiOutput {
  const task = input.task.toLowerCase();
  const sourceText = cleanPromptText(input.sourceText);
  const context = cleanPromptText(input.patientContext);
  const concerns = extractConcerns(sourceText);
  const findings = extractFindings(sourceText);
  const flags = detectFlags(sourceText, findings);
  const summary = buildSummary(concerns, findings, flags);

  if (task.includes("soap")) {
    return {
      disclaimer,
      soap: buildSoap(concerns, findings, flags),
      flags
    };
  }

  if (task.includes("operational tasks") || task.includes("extract operational")) {
    return {
      disclaimer,
      tasks: buildTasks(sourceText, findings, flags),
      flags
    };
  }

  if (task.includes("portal request") || task.includes("patient-safe reply") || task.includes("patient-visible portal")) {
    return {
      disclaimer,
      summary: summary || "Portal request reviewed for a patient-safe staff reply.",
      patientReply: buildPortalReply(sourceText, flags),
      flags: [
        ...flags,
        "Staff must verify scheduling, results, medication instructions, and clinic policy before sending."
      ].slice(0, 8)
    };
  }

  if (task.includes("patient-friendly") || task.includes("follow-up instructions") || task.includes("visit summary")) {
    return {
      disclaimer,
      summary: patientFriendlySummary(concerns, findings),
      patientInstructions: buildPatientInstructions(sourceText, findings, flags),
      flags
    };
  }

  if (task.includes("extract key medical information") || task.includes("document")) {
    return {
      disclaimer,
      summary,
      extracted: {
        dates: extractDates(sourceText),
        medications: extractMedicationHints(sourceText),
        abnormalValues: findings.filter((finding) => finding.status === "abnormal"),
        followUpNeeds: followUpNeeds(sourceText, flags)
      },
      flags
    };
  }

  if (task.includes("important keywords") || task.includes("risk")) {
    return {
      disclaimer,
      flags,
      explanation: explainFlags(flags, findings)
    };
  }

  if (task.includes("referral letter")) {
    return {
      disclaimer,
      referralLetter: buildReferralLetter(context, summary, flags),
      flags: [...flags, "Doctor should add referral destination, urgency, and signed clinical impression before sending."]
    };
  }

  if (task.includes("answer the doctor's question") || task.includes("search matches")) {
    return {
      disclaimer,
      answer: buildAssistantAnswer(input.question, summary, flags),
      citations: concerns.slice(0, 4),
      flags
    };
  }

  return {
    disclaimer,
    summary,
    flags
  };
}

function extractSection(prompt: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = prompt.match(new RegExp(`${escaped}:\\s*([\\s\\S]*?)(?:\\n\\s*(?:Patient context|Source text|Doctor question|Task|Return JSON)\\s*:|$)`, "i"));
  return cleanPromptText(match?.[1] ?? "");
}

function extractDoctorQuestion(prompt: string) {
  const match = prompt.match(/Doctor question:\s*([\s\S]*?)(?:\n\s*Task:|$)/i);
  return cleanPromptText(match?.[1] ?? "");
}

function cleanPromptText(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

function extractConcerns(sourceText: string) {
  const lines = sourceText
    .split(/\n|;|\.\s+/)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((line) => line.length > 2 && !line.toLowerCase().startsWith("return json"));

  return lines.length ? lines.slice(0, 10) : [sourceText.slice(0, 240)].filter(Boolean);
}

function extractFindings(sourceText: string): Finding[] {
  const findings: Finding[] = [];
  const text = sourceText.replace(/\s+/g, " ");
  const patterns: Array<[RegExp, string]> = [
    [/\bHbA1c\s*(?:is|:|of)?\s*([0-9]+(?:\.[0-9]+)?\s*%?)/i, "HbA1c"],
    [/\bglucose(?:\s+readings)?\s*(?:are|is|:)?\s*([0-9]+(?:\s*-\s*[0-9]+)?\s*(?:mg\/dL)?)/i, "Glucose"],
    [/\bLDL\s*(?:is|:)?\s*([0-9]+(?:\.[0-9]+)?\s*(?:mg\/dL)?)/i, "LDL"],
    [/\b(?:urine\s+ACR|ACR)\s*(?:is|:)?\s*([0-9]+(?:\.[0-9]+)?\s*(?:mg\/g)?)/i, "Urine ACR"],
    [/\beGFR\s*(?:is|:)?\s*([0-9]+(?:\.[0-9]+)?)/i, "eGFR"],
    [/\bB12\b\s*(?:is|:)?\s*([0-9]+(?:\.[0-9]+)?\s*(?:pg\/mL)?)/i, "B12"]
  ];

  for (const [pattern, label] of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      findings.push({
        label,
        value: match[1].trim(),
        status: abnormalStatus(label, match[1]),
        source: "local text scan"
      });
    } else if (new RegExp(`\\b${label.replace(" ", "\\s+")}\\b`, "i").test(text)) {
      findings.push({ label, value: "ordered or mentioned", status: "pending", source: "local text scan" });
    }
  }

  return dedupeBy(findings, (finding) => finding.label.toLowerCase());
}

function abnormalStatus(label: string, value: string): Finding["status"] {
  const firstNumber = Number(value.match(/[0-9]+(?:\.[0-9]+)?/)?.[0] ?? 0);
  if (label === "HbA1c" && firstNumber >= 6.5) return "abnormal";
  if (label === "Glucose" && firstNumber >= 140) return "abnormal";
  if (label === "LDL" && firstNumber >= 130) return "abnormal";
  if (label === "Urine ACR" && firstNumber >= 30) return "abnormal";
  if (label === "eGFR" && firstNumber > 0 && firstNumber < 60) return "abnormal";
  return "mentioned";
}

function detectFlags(sourceText: string, findings: Finding[]) {
  const lower = sourceText.toLowerCase();
  const flags = findings
    .filter((finding) => finding.status === "abnormal" || finding.status === "pending")
    .map((finding) =>
      finding.status === "pending"
        ? `${finding.label} was ordered or mentioned; confirm result and follow-up plan.`
        : `${finding.label} ${finding.value} may need clinician review based on the note.`
    );

  if (/missed|overdue|no[-\s]?show|not completed/.test(lower)) {
    flags.push("Missed or overdue follow-up is mentioned; confirm scheduling and outreach.");
  }
  if (/eye exam|retina|retinal/.test(lower)) {
    flags.push("Eye exam follow-up is mentioned; verify status and next appointment.");
  }
  if (/tingling|numbness|neuropathy|foot/.test(lower)) {
    flags.push("Neuropathy-like symptoms are mentioned; doctor review is required.");
  }
  if (/fatigue|tired/.test(lower)) {
    flags.push("Fatigue is reported; review duration, associated symptoms, and pending labs.");
  }

  flags.push("Generated by local fallback rules; verify wording, clinical interpretation, and missing context.");
  return dedupe(flags).slice(0, 8);
}

function buildSummary(concerns: string[], findings: Finding[], flags: string[]) {
  const concernText = concerns.length ? concerns.join("; ") : "No source details were provided.";
  const findingText = findings.length
    ? ` Key extracted items: ${findings.map((finding) => `${finding.label} ${finding.value}`).join(", ")}.`
    : "";
  const reviewText = flags.length ? ` Review focus: ${flags.slice(0, 3).join(" ")}` : "";
  return `${sentenceCase(concernText)}.${findingText}${reviewText}`.replace(/\.\./g, ".");
}

function buildSoap(concerns: string[], findings: Finding[], flags: string[]): SafeAiOutput["soap"] {
  const subjective = concerns.filter((item) => !/\bordered\b/i.test(item)).join("; ") || "Patient-reported details not provided.";
  const objective = findings.length
    ? findings.map((finding) => `${finding.label}: ${finding.value} (${finding.status})`).join("; ")
    : "No objective findings or values were provided in the source text.";
  const assessment = flags.length
    ? `Issues requiring clinician review: ${flags.slice(0, 4).join(" ")}`
    : "No assessment should be finalized from the available context alone.";
  const planItems = [
    ...followUpNeeds(concerns.join("; "), flags),
    "Doctor to verify draft, update assessment, and sign only after clinical review."
  ];

  return {
    subjective,
    objective,
    assessment,
    plan: dedupe(planItems).join(" ")
  };
}

function buildTasks(sourceText: string, findings: Finding[], flags: string[]): NonNullable<SafeAiOutput["tasks"]> {
  const lower = sourceText.toLowerCase();
  const tasks: NonNullable<SafeAiOutput["tasks"]> = [];

  if (/eye exam|retina|retinal|missed/.test(lower)) {
    tasks.push({
      title: "Contact patient to schedule overdue eye exam follow-up",
      priority: "high",
      rationale: "The note mentions a missed eye exam or follow-up need."
    });
  }
  if (/hba1c|urine acr|b12|ordered/.test(lower)) {
    tasks.push({
      title: "Track ordered lab results and route to doctor",
      priority: "medium",
      rationale: "The note includes ordered labs that require result review."
    });
  }
  if (/glucose/.test(lower)) {
    tasks.push({
      title: "Prepare glucose log or recent readings for clinician review",
      priority: "medium",
      rationale: "Glucose readings are mentioned and may affect follow-up planning."
    });
  }
  if (/tingling|numbness|foot|neuropathy/.test(lower)) {
    tasks.push({
      title: "Flag neuropathy-like symptoms for doctor review",
      priority: "high",
      rationale: "Tingling, numbness, foot symptoms, or neuropathy terms appear in the note."
    });
  }

  for (const finding of findings.filter((item) => item.status === "abnormal")) {
    tasks.push({
      title: `Review ${finding.label} result`,
      priority: "medium",
      rationale: `${finding.label} ${finding.value} was identified by local text scan.`
    });
  }

  if (!tasks.length) {
    tasks.push({
      title: "Doctor review of AI draft",
      priority: "medium",
      rationale: flags[0] ?? "Local fallback could not identify a specific operational task."
    });
  }

  return dedupeTasks(tasks).slice(0, 6);
}

function buildPatientInstructions(sourceText: string, findings: Finding[], flags: string[]) {
  const instructions = [
    "Please follow the plan discussed with your doctor and wait for the clinic to confirm any test results.",
    "Contact the clinic if symptoms worsen, new symptoms appear, or you are unsure about the next step."
  ];
  if (/eye exam|retina|retinal|missed/i.test(sourceText)) instructions.push("The clinic may help schedule or confirm your eye exam follow-up.");
  if (/hba1c|urine acr|b12|ordered/i.test(sourceText)) instructions.push("Complete ordered lab tests as instructed and ask when results will be reviewed.");
  if (findings.some((finding) => finding.status === "abnormal")) instructions.push("Some values may need doctor review before any changes are made.");
  if (flags.some((flag) => /tingling|neuropathy/i.test(flag))) instructions.push("Tell the clinic promptly if tingling, numbness, pain, or weakness changes.");
  return dedupe(instructions).slice(0, 6);
}

function buildPortalReply(sourceText: string, flags: string[]) {
  const lower = sourceText.toLowerCase();
  const lines = [
    "Thank you for your message. We have received your request and will route it to the clinic team for review."
  ];

  if (/appointment|schedule|follow-up|follow up/.test(lower)) {
    lines.push("A staff member will check the schedule and follow up with available appointment options.");
  }
  if (/document|report|lab|result/.test(lower)) {
    lines.push("If this is about a report or lab result, the clinic will confirm whether it has been reviewed before giving next-step instructions.");
  }
  if (/medication|refill|dose|dosage/.test(lower)) {
    lines.push("Please do not change any medication unless your clinician has specifically told you to do so.");
  }
  if (/urgent|emergency|chest pain|shortness of breath|severe/.test(lower)) {
    lines.push("If you are having urgent or severe symptoms, please contact emergency services or call the clinic directly.");
  }

  lines.push("This is a draft reply and should be reviewed by clinic staff before sending.");

  if (flags.length) {
    lines.push("Before sending, verify any clinical details, pending results, and promised follow-up timing.");
  }

  return dedupe(lines).join(" ");
}

function patientFriendlySummary(concerns: string[], findings: Finding[]) {
  const plainConcerns = concerns.map((concern) => concern.replace(/\bpatient\b/gi, "you")).join("; ");
  const values = findings.length ? ` The note also mentions: ${findings.map((finding) => `${finding.label} ${finding.value}`).join(", ")}.` : "";
  return `${plainConcerns || "Your doctor added notes for review."}.${values} This is a draft and your doctor must review it before it is used.`;
}

function extractDates(sourceText: string) {
  return sourceText.match(/\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/gi) ?? [];
}

function extractMedicationHints(sourceText: string) {
  const matches = sourceText.match(/\b(?:metformin|insulin|atorvastatin|lisinopril|amlodipine|aspirin|b12)\b/gi) ?? [];
  return dedupe(matches.map((match) => match.trim()));
}

function followUpNeeds(sourceText: string, flags: string[]) {
  const needs: string[] = [];
  if (/eye exam|retina|retinal|missed|overdue/i.test(sourceText)) needs.push("Confirm overdue/missed follow-up and schedule outreach.");
  if (/ordered|hba1c|urine acr|b12/i.test(sourceText)) needs.push("Track ordered labs and confirm result review.");
  if (/tingling|numbness|foot|neuropathy/i.test(sourceText)) needs.push("Route neuropathy-like symptoms to clinician for review.");
  if (!needs.length && flags.length) needs.push("Review flagged items and document follow-up plan.");
  return dedupe(needs);
}

function explainFlags(flags: string[], findings: Finding[]) {
  const findingText = findings.length
    ? `Local text scan identified ${findings.map((finding) => `${finding.label} ${finding.value} (${finding.status})`).join(", ")}. `
    : "";
  return `${findingText}${flags.join(" ")} This explanation is a workflow aid only and must be checked by the doctor.`;
}

function buildReferralLetter(context: string, summary: string, flags: string[]) {
  const patientLine = context && !/No extra patient context/i.test(context) ? `Patient context: ${context}\n\n` : "";
  return [
    "Dear Specialist,",
    "",
    `${patientLine}I am requesting your input for the concerns summarized below.`,
    "",
    `Clinical summary: ${summary}`,
    "",
    `Items needing review before sending: ${flags.slice(0, 4).join(" ")}`,
    "",
    "Please evaluate and advise on recommended next steps. This draft requires doctor review before it is sent.",
    "",
    "Sincerely,"
  ].join("\n");
}

function buildAssistantAnswer(question: string | undefined, summary: string, flags: string[]) {
  const questionLead = question ? `For the question "${question}", ` : "";
  return `${questionLead}the provided context suggests reviewing: ${summary} Key safety checks: ${flags.slice(0, 4).join(" ")}`;
}

function sentenceCase(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function dedupeBy<T>(values: T[], key: (value: T) => string) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const id = key(value);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function dedupeTasks(tasks: NonNullable<SafeAiOutput["tasks"]>) {
  return dedupeBy(tasks, (task) => task.title.toLowerCase());
}

export function hashEmbedding(input: string, dimensions = 64) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = input.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i += 1) {
      hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    }
    vector[hash % dimensions] += 1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(6)));
}
