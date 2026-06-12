import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SafetyBanner } from "@/components/safety-banner";

describe("SafetyBanner", () => {
  it("states doctor review requirement", () => {
    render(<SafetyBanner />);
    expect(screen.getByText(/require doctor review/i)).toBeInTheDocument();
  });
});
