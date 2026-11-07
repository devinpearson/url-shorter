import type { Pool } from "pg";

export type ContactTopic = "question" | "feedback" | "report";

export interface NewContactMessage {
  name: string;
  email: string;
  topic: ContactTopic;
  link?: string;
  message: string;
  userId?: string;
}

/** Saves a message and returns its id. */
export async function saveContactMessage(pool: Pool, msg: NewContactMessage): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO contact_messages (name, email, topic, link, message, user_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [msg.name, msg.email, msg.topic, msg.link ?? null, msg.message, msg.userId ?? null],
  );
  return rows[0].id;
}

export async function markContactMessageEmailed(pool: Pool, id: string) {
  await pool.query("UPDATE contact_messages SET emailed = true WHERE id = $1", [id]);
}
