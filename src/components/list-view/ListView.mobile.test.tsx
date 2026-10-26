import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ListView from "./ListView";
import type { Task } from "@/types";

const { openTask } = vi.hoisted(() => ({ openTask: vi.fn() }));
vi.mock("@/store/useTaskSidebarStore", () => ({
  useTaskSidebarStore: () => ({ openTask }),
}));

const task = {
  _id: "task-1",
  name: "A very long task title that should wrap on a phone instead of forcing the page wide",
  title: "A very long task title that should wrap on a phone instead of forcing the page wide",
  description: "Check responsive task handling",
  // This legacy list view receives display statuses rather than canonical task statuses.
  status: "to do" as Task["status"],
  priority: "high",
  dueDate: "2026-11-01T00:00:00.000Z",
  list: "list-1",
  space: "space-1",
  workspace: "workspace-1",
  order: 0,
  isDeleted: false,
  createdBy: { _id: "user-1", name: "Tester", email: "tester@example.com" },
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
} satisfies Task;

describe("ListView mobile layout", () => {
  beforeEach(() => openTask.mockClear());

  it("shows task details in a compact card and keeps its open action", () => {
    render(<ListView tasks={[task]} onTaskUpdate={vi.fn()} onTaskCreate={vi.fn()} onTaskDelete={vi.fn()} />);
    expect(screen.getByTestId("mobile-task-card-task-1")).toBeTruthy();
    fireEvent.click(within(screen.getByTestId("mobile-task-card-task-1")).getByRole("button", { name: `Open task: ${task.title}` }));
    expect(openTask).toHaveBeenCalledWith("task-1");
  });

  it("keeps task selection available for bulk actions on phones", () => {
    render(<ListView tasks={[task]} onTaskUpdate={vi.fn()} onTaskCreate={vi.fn()} onTaskDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole("checkbox", { name: `Select ${task.title}` }));
    expect(screen.getByText("1 task(s) selected")).toBeTruthy();
  });
});
