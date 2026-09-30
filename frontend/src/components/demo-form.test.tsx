// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DemoForm } from "./demo-form";

describe("DemoForm", () => {
  it("rejects an empty name and submits a valid one", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<DemoForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Name is required");
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByRole("textbox", { name: "Name" }), "Ada");
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalledWith({ name: "Ada" });
  });
});
