import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AiOutputRenderer } from "@/components/ai-output-renderer";
import { SafetyBanner } from "@/components/safety-banner";

describe("SafetyBanner", () => {
  it("states doctor review requirement", () => {
    render(<SafetyBanner />);
    expect(screen.getByText(/require doctor review/i)).toBeInTheDocument();
  });
});

describe("AiOutputRenderer", () => {
  it("renders summaries as readable paragraphs instead of raw JSON", () => {
    render(
      <AiOutputRenderer
        output={{
          disclaimer: "AI draft, doctor review required.",
          summary: "Patient reports fatigue for three weeks. Labs were ordered for follow-up."
        }}
        metadata={{ provider: "ollama", model: "qwen2.5:1.5b", reviewStatus: "DRAFT" }}
      />
    );

    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText(/Patient reports fatigue/i)).toBeInTheDocument();
    expect(screen.queryByText(/"summary"/i)).not.toBeInTheDocument();
  });

  it("renders extracted tasks as clinical bullet-style items", () => {
    render(
      <AiOutputRenderer
        output={{
          disclaimer: "AI draft, doctor review required.",
          tasks: [{ title: "Call patient about eye exam", priority: "medium", rationale: "Missed follow-up noted." }]
        }}
      />
    );

    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Call patient about eye exam")).toBeInTheDocument();
    expect(screen.getByText("medium")).toBeInTheDocument();
  });
});
