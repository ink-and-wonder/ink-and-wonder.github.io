import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { freshSave } from "../dist/state.js";
test("Postgres enforces private saves, valid payloads, and compare-and-swap revisions", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated;insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`,
    );
    await db.exec(
      fs.readFileSync(
        new URL("../supabase/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(
      `set role authenticated;set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';`,
    );
    const payload = JSON.stringify(freshSave());
    let result = await db.query(
      "select * from public.commit_game_save(0,$1::jsonb)",
      [payload],
    );
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].revision, 1);
    result = await db.query(
      "select * from public.commit_game_save(0,$1::jsonb)",
      [payload],
    );
    assert.equal(result.rows.length, 0);
    result = await db.query(
      "select * from public.commit_game_save(1,$1::jsonb)",
      [payload],
    );
    assert.equal(result.rows[0].revision, 2);
    await assert.rejects(
      db.query("select * from public.commit_game_save(2,$1::jsonb)", ["{}"]),
    );
    await db.exec(
      `set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';`,
    );
    result = await db.query("select * from public.game_saves");
    assert.equal(result.rows.length, 0);
    result = await db.query(
      `update public.game_saves set payload=$1::jsonb where user_id='11111111-1111-4111-8111-111111111111' returning *`,
      [payload],
    );
    assert.equal(result.rows.length, 0);
    await assert.rejects(
      db.query(
        `insert into public.game_saves(user_id,payload) values('11111111-1111-4111-8111-111111111111',$1::jsonb)`,
        [payload],
      ),
    );
    result = await db.query(
      "select * from public.commit_game_save(0,$1::jsonb)",
      [payload],
    );
    assert.equal(
      result.rows[0].user_id,
      "22222222-2222-4222-8222-222222222222",
    );
    await db.exec(`reset role;set role anon;set request.jwt.claim.sub='';`);
    await assert.rejects(db.query("select * from public.game_saves"));
    await assert.rejects(
      db.query("select * from public.commit_game_save(0,$1::jsonb)", [payload]),
    );
  } finally {
    await db.close();
  }
});
