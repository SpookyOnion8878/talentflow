import { describe, expect, it } from "vitest";
import { toolRegistry } from "../src/tools/registry";

describe("agent tool approval policy", () => {
  it("requires every mutating tool to declare human approval roles", () => {
    for (const tool of toolRegistry.filter(
      (candidate) => !candidate.readOnly,
    )) {
      expect(tool.approvalPermission, tool.name).toBeDefined();
      expect(tool.approvalPermission?.length, tool.name).toBeGreaterThan(0);
    }
  });
});
