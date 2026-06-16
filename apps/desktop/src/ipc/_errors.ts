export class IpcError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "IpcError";
  }
}

export function toErrorPayload(err: unknown): { message: string; code: string } {
  if (err instanceof IpcError) {
    return { message: err.message, code: err.code };
  }
  if (err instanceof Error) {
    return { message: err.message, code: "UNKNOWN" };
  }
  return { message: String(err), code: "UNKNOWN" };
}
