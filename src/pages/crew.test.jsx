import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreateGroupForm } from "../components/SocialForms.jsx";

describe("create group form", () => {
  it("keeps the directory checkbox inline with its label", () => {
    render(<CreateGroupForm onSubmit={vi.fn()} busy="" />);
    const checkbox = screen.getByRole("checkbox", { name: /list in the directory/i });
    const label = checkbox.closest("label");
    expect(label.className).toContain("check");
    expect(label.textContent.trim()).toMatch(/list in the directory/i);
    expect(checkbox.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_CONTAINS).toBeTruthy();
  });
});
