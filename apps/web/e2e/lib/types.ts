export type StepAction =
  | { action: "goto"; url: string }
  | { action: "click"; testId: string }
  | { action: "fill"; testId: string; value: string }
  | { action: "waitFor"; testId: string; timeout?: number }
  | { action: "assertVisible"; testId: string }
  | { action: "assertText"; testId: string; text: string }
  | { action: "assertUrl"; pattern: string };

export interface TestCase {
  id: string;
  name: string;
  steps: StepAction[];
  expected: string;
  tags: string[];
  result?: "pass" | "fail" | "skip";
}
