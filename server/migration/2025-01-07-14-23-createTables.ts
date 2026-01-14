import { pool } from "../database.ts";

const query = `
CREATE SCHEMA IF NOT EXISTS definy_local;

CREATE TABLE IF NOT EXISTS definy_local.create_account_event (
    id bytea PRIMARY KEY,
    signedEventAsCbor bytea NOT NULL,
    account_id bytea NOT NULL,
    name text NOT NULL,
    time timestamptz NOT NULL,
    server_time timestamptz NOT NULL DEFAULT now()
);

alter table definy_local.create_account_event enable row level security;
`;

const result = await pool.query(query);

console.log(result);
await pool.end();
