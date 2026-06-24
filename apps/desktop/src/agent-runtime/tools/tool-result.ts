import type { AgentToolResult } from "@earendil-works/pi-agent-core";

export function textResult(text: string): AgentToolResult<unknown> {
  return {
    content: [{ type: "text", text }],
    details: undefined,
  };
}
