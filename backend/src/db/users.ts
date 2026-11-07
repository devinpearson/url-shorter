import type { Pool } from "pg";

export interface User {
  id: string;
  auth0Id: string;
  displayName: string;
  email: string | null;
}

const COLUMNS = `id, auth0_id AS "auth0Id", display_name AS "displayName", email`;

export async function findUserById(pool: Pool, id: string): Promise<User | null> {
  const { rows } = await pool.query<User>(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/**
 * Returns the user with this Auth0 id, creating them on first login. Safe when two logins
 * for the same new user race: the unique auth0_id makes the second insert a no-op.
 */
export async function findOrCreateUser(
  pool: Pool,
  input: { auth0Id: string; displayName: string; email?: string | null },
): Promise<User> {
  const { rows } = await pool.query<User>(
    `WITH inserted AS (
       INSERT INTO users (auth0_id, display_name, email)
       VALUES ($1, $2, $3)
       ON CONFLICT (auth0_id) DO NOTHING
       RETURNING ${COLUMNS}
     )
     SELECT * FROM inserted
     UNION ALL
     SELECT ${COLUMNS} FROM users WHERE auth0_id = $1
     LIMIT 1`,
    [input.auth0Id, input.displayName, input.email || null],
  );
  if (!rows[0]) throw new Error(`Could not create or find user ${input.auth0Id}`);
  return rows[0];
}
