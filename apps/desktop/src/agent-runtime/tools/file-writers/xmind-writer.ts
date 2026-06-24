import fs from "node:fs/promises";
import path from "node:path";
import { RootTopic, Topic, Workbook } from "xmind-generator";
import type { FileWriter, Topic as TopicInput, WriteXFileParams } from "./types.js";

const DEFAULT_ROOT_TITLE = "Mind Map";

/**
 * 将前端传入的 Topic 树递归转换为 xmind-generator 的 Topic builder。
 */
function buildTopicNode(input: TopicInput) {
  const node = Topic(input.title);
  if (input.children && input.children.length > 0) {
    node.children(input.children.map(buildTopicNode));
  }
  return node;
}

/**
 * 使用 xmind-generator 构建 XMind 工作簿，并写入 resolvedPath。
 */
async function writeXmind(
  params: WriteXFileParams,
  resolvedPath: string,
): Promise<void> {
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });

  const rootTitle = params.title?.trim() || DEFAULT_ROOT_TITLE;
  const rootTopic = RootTopic(rootTitle);

  const topics = params.topics ?? [];
  if (topics.length > 0) {
    rootTopic.children(topics.map(buildTopicNode));
  }

  const workbook = Workbook(rootTopic);
  const arrayBuffer = await workbook.archive();
  const buffer = Buffer.from(arrayBuffer);

  await fs.writeFile(resolvedPath, buffer);
}

export const xmindWriter: FileWriter = {
  extensions: [".xmind"],
  write: writeXmind,
};
