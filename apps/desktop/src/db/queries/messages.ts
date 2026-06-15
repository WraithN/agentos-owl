import type Database from "better-sqlite3";
import type { Message } from "../types.js";
import { fromJson, toJson } from "./_json.js";

const selectColumns = `
  SELECT id, conversation_id, msg_type, content_type, status, content, agent_id, timestamp,
         tool_call_json, cot_steps_json, code_block_json, image_url, image_caption,
         card_data_json, mentions_json, attachments_json, meta_json
  FROM messages
`;

export function listMessages(
  db: Database.Database,
  conversationId: string
): Message[] {
  const rows = db
    .prepare(`${selectColumns} WHERE conversation_id = ? ORDER BY timestamp ASC`)
    .all(conversationId) as Record<string, unknown>[];
  return rows.map(mapMessage);
}

export function upsertMessage(db: Database.Database, msg: Message): void {
  db.prepare(
    `INSERT INTO messages (id, conversation_id, msg_type, content_type, status, content, agent_id, timestamp,
                           tool_call_json, cot_steps_json, code_block_json, image_url, image_caption,
                           card_data_json, mentions_json, attachments_json, meta_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
        content = excluded.content, status = excluded.status, agent_id = excluded.agent_id,
        tool_call_json = excluded.tool_call_json, cot_steps_json = excluded.cot_steps_json,
        code_block_json = excluded.code_block_json, image_url = excluded.image_url,
        image_caption = excluded.image_caption, card_data_json = excluded.card_data_json,
        mentions_json = excluded.mentions_json, attachments_json = excluded.attachments_json,
        meta_json = excluded.meta_json`
  ).run(
    msg.id,
    msg.conversationId,
    msg.msgType,
    msg.contentType,
    msg.status,
    msg.content,
    msg.agentId ?? null,
    msg.timestamp,
    msg.toolCall ? toJson(msg.toolCall) : null,
    msg.cotSteps ? toJson(msg.cotSteps) : null,
    msg.codeBlock ? toJson(msg.codeBlock) : null,
    msg.imageUrl ?? null,
    msg.imageCaption ?? null,
    msg.cardData ? toJson(msg.cardData) : null,
    msg.mentions ? toJson(msg.mentions) : null,
    msg.attachments ? toJson(msg.attachments) : null,
    msg.meta ? toJson(msg.meta) : null
  );
}

export function deleteMessage(db: Database.Database, id: string): void {
  db.prepare("DELETE FROM messages WHERE id = ?").run(id);
}

function mapMessage(row: Record<string, unknown>): Message {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    msgType: String(row.msg_type),
    contentType: String(row.content_type),
    status: String(row.status),
    content: String(row.content),
    agentId: row.agent_id ? String(row.agent_id) : undefined,
    timestamp: Number(row.timestamp),
    toolCall: fromJson(row.tool_call_json as string | null, undefined),
    cotSteps: fromJson(row.cot_steps_json as string | null, undefined),
    codeBlock: fromJson(row.code_block_json as string | null, undefined),
    imageUrl: row.image_url ? String(row.image_url) : undefined,
    imageCaption: row.image_caption ? String(row.image_caption) : undefined,
    cardData: fromJson(row.card_data_json as string | null, undefined),
    mentions: fromJson(row.mentions_json as string | null, undefined),
    attachments: fromJson(row.attachments_json as string | null, undefined),
    meta: fromJson(row.meta_json as string | null, undefined),
  };
}
