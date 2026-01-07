import { pool } from "../database.ts";

const result = await pool.query(`
    CREATE SCHEMA IF NOT EXISTS definy_local;

    CREATE TABLE IF NOT EXISTS definy_local.create_account_event (
        account_id bytea PRIMARY KEY,
        name text NOT NULL,
        create_at timestamptz NOT NULL
    );
`);

console.log(result);
