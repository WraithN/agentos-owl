import type { AgentDriverChunk, TeammateStatus } from "@owl-os/core";
import type { SessionSlot } from "../session/slot.js";
import type { ControlCommand, SessionRuntimePort } from "./port-types.js";

export function createSessionRuntimePortForSlot(slot: SessionSlot): SessionRuntimePort {
  return {
    postCommand: (command: ControlCommand) => slot.sendCommand(command),
    onChunk: (callback: (chunk: AgentDriverChunk) => void) => {
      slot.on("chunk", callback);
      return () => slot.off("chunk", callback);
    },
    onStatus: (callback: (status: TeammateStatus) => void) => {
      slot.on("status", callback);
      return () => slot.off("status", callback);
    },
    onDone: (callback: () => void) => {
      slot.on("done", callback);
      return () => slot.off("done", callback);
    },
    onError: (callback: (error: string) => void) => {
      slot.on("error", callback);
      return () => slot.off("error", callback);
    },
  };
}
