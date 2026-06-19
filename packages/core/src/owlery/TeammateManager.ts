import type { ElderAgentRuntime, WorkerAgentRuntime } from "../agent/AgentRuntime.js";
import type { AgentDriverChunk, AgentId, AgentMessage, AgentTask, AgentTaskResult, ChannelId, SessionId, Teammate, TeammateMode } from "../agent/types.js";
import { AgentPool } from "./AgentPool.js";
import type { MessageBox } from "./MessageBox.js";

const BRAINSTORM_WORKER_LIMIT = 3;

export interface BrainstormWorkerResult {
  workerId: AgentId;
  content: string;
}

export interface BrainstormResult {
  mode: "brainstorm";
  ideas: BrainstormWorkerResult[];
  summary: string;
}

export interface TeammateManagerOptions {
  teammate: Teammate;
  id: string;
  name: string;
  mode: TeammateMode;
  sessionId: SessionId;
  elderAgentId: AgentId;
  primarySentinelId: AgentId;
  elderPrimaryChannelId: ChannelId;
  agentPool: AgentPool;
  messageBox: MessageBox;
}

export class TeammateManager {
  readonly teammate: Teammate;
  readonly id: string;
  readonly name: string;
  readonly mode: TeammateMode;
  readonly sessionId: SessionId;
  readonly elderAgentId: AgentId;
  readonly primarySentinelId: AgentId;
  readonly elderPrimaryChannelId: ChannelId;
  readonly agentPool: AgentPool;

  constructor(private readonly options: TeammateManagerOptions) {
    this.teammate = options.teammate;
    this.id = options.id;
    this.name = options.name;
    this.mode = options.mode;
    this.sessionId = options.sessionId;
    this.elderAgentId = options.elderAgentId;
    this.primarySentinelId = options.primarySentinelId;
    this.elderPrimaryChannelId = options.elderPrimaryChannelId;
    this.agentPool = options.agentPool;
  }

  async dispatch(task: AgentTask): Promise<AgentTaskResult> {
    if (this.mode === "brainstorm") return this.dispatchBrainstorm(task);

    const message = this.createDispatchMessage(task);
    await this.options.messageBox.send(this.elderPrimaryChannelId, this.elderAgentId, message);
    return {
      taskId: task.id,
      agentId: this.primarySentinelId,
      status: "success",
      content: message.payload,
      createdAt: Date.now(),
    };
  }

  private async dispatchBrainstorm(task: AgentTask): Promise<AgentTaskResult<BrainstormResult>> {
    const workers = this.selectBrainstormWorkers();
    const results = await Promise.all(workers.map((worker, index) => this.runBrainstormWorker(worker, task, index)));
    const result: BrainstormResult = {
      mode: "brainstorm",
      ideas: results,
      summary: results.map((item, index) => `${index + 1}. ${item.content}`).join("\n"),
    };

    return {
      taskId: task.id,
      agentId: this.primarySentinelId,
      status: "success",
      content: result,
      createdAt: Date.now(),
    };
  }

  private createDispatchMessage(task: AgentTask): AgentMessage<{ task: AgentTask; mode: TeammateMode }> {
    return {
      id: `${task.id}:dispatch`,
      from: this.elderAgentId,
      to: this.primarySentinelId,
      sessionId: this.sessionId,
      kind: "request",
      payload: { task, mode: this.mode },
      createdAt: Date.now(),
    };
  }

  private selectBrainstormWorkers(): WorkerAgentRuntime[] {
    const workers = this.agentPool.listWorkers();
    if (workers.length === 0) throw new Error("Brainstorm mode requires at least one worker");
    return workers.slice(0, BRAINSTORM_WORKER_LIMIT);
  }

  private async runBrainstormWorker(worker: WorkerAgentRuntime, task: AgentTask, index: number): Promise<BrainstormWorkerResult> {
    const message: AgentMessage<{ task: AgentTask; perspectiveIndex: number }> = {
      id: `${task.id}:brainstorm:${worker.id}`,
      from: this.primarySentinelId,
      to: worker.id,
      sessionId: this.sessionId,
      kind: "request",
      payload: { task, perspectiveIndex: index + 1 },
      createdAt: Date.now(),
    };
    const chunks: AgentDriverChunk[] = [];
    for await (const chunk of worker.streamChat({ sessionId: this.sessionId, messages: [message], context: task.context })) {
      chunks.push(chunk);
    }
    return { workerId: worker.id, content: this.collectText(chunks) };
  }

  private collectText(chunks: AgentDriverChunk[]): string {
    const error = chunks.find((chunk) => chunk.type === "error");
    if (error?.type === "error") return `执行失败：${error.error}`;
    return chunks.map((chunk) => (chunk.type === "text_delta" ? chunk.text : "")).join("").trim();
  }

  receiveFromSentinel(): AsyncIterable<AgentMessage> {
    return this.options.messageBox.receive(this.elderPrimaryChannelId, this.elderAgentId);
  }
}

export async function createBasicTeammates(params: {
  elder: ElderAgentRuntime;
  mode: TeammateMode;
  sessionId: SessionId;
  messageBox: MessageBox;
  pool: AgentPool;
  teammate: Teammate;
}): Promise<TeammateManager> {
  const primarySentinel = params.pool.getPrimarySentinel();
  const channel = params.messageBox.createChannel({
    sessionId: params.sessionId,
    endpointA: params.elder.id,
    endpointB: primarySentinel.id,
  });

  return new TeammateManager({
    teammate: params.teammate,
    id: params.teammate.id,
    name: params.teammate.name,
    mode: params.mode,
    sessionId: params.sessionId,
    elderAgentId: params.elder.id,
    primarySentinelId: primarySentinel.id,
    elderPrimaryChannelId: channel.id,
    agentPool: params.pool,
    messageBox: params.messageBox,
  });
}
