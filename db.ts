import { Database } from "bun:sqlite";

const db = new Database(".cache/summer.db");

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    bloodern INTEGER DEFAULT 0,
    shellite INTEGER DEFAULT 0
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS castles (
    user_id TEXT PRIMARY KEY,
    stage INTEGER DEFAULT 0,
    health INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )
`);

export default db;
