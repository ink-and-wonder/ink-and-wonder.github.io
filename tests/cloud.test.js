import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CloudAccount,
  accountSaveKey,
  checkCloudConfig,
} from "../dist/cloud.js";
import { freshSave } from "../dist/state.js";
const config = {
    supabaseUrl: "https://example.supabase.co",
    publishableKey: "sb_publishable_" + "x".repeat(32),
  },
  userA = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "a@example.test",
  },
  userB = {
    id: "22222222-2222-4222-8222-222222222222",
    email: "b@example.test",
  };
function harness() {
  const memory = new Map(),
    records = new Map(),
    writes = [],
    timers = [];
  let current = freshSave(),
    session = { user: userA },
    offline = false,
    readHook = null,
    writeHook = null,
    authCallback;
  const storage = {
    getItem: (k) => memory.get(k) || null,
    setItem: (k, v) => memory.set(k, v),
    removeItem: (k) => memory.delete(k),
  };
  const sdk = {
    auth: {
      onAuthStateChange: (fn) => (
        (authCallback = fn),
        { data: { subscription: { unsubscribe() {} } } }
      ),
      getSession: async () => ({ data: { session } }),
      signInWithPassword: async () => ({ data: { session } }),
      signUp: async () => ({ data: { session: null } }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ error: null }),
      updateUser: async () => ({ error: null }),
      resend: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: (column, id) => ({
          maybeSingle: async () => {
            if (offline) throw Error("Network offline");
            if (readHook) await readHook();
            return { data: structuredClone(records.get(id) || null) };
          },
        }),
      }),
    }),
    rpc: async (name, args) => {
      if (offline) throw Error("Network offline");
      const id = session.user.id,
        old = records.get(id);
      if ((old?.revision || 0) !== args.expected_revision) return { data: [] };
      const row = {
        payload: structuredClone(args.new_payload),
        revision: (old?.revision || 0) + 1,
        updated_at: "2026-10-17T00:00:00Z",
      };
      if (writeHook) await writeHook();
      records.set(id, row);
      writes.push({ id, ...row });
      return { data: [row] };
    },
  };
  const app = new CloudAccount({
    config,
    isWeb:()=>true,
    storage,
    getSave: () => current,
    onIdentity: (u) => {
      const raw = u ? storage.getItem(accountSaveKey(u.id)) : null;
      current = raw ? JSON.parse(raw) : freshSave();
    },
    onSave: (s) => {
      current = s;
      storage.setItem(accountSaveKey(app.user.id), JSON.stringify(s));
    },
    loadClient: async () => ({ createClient: () => sdk }),
    schedule: (fn, time) => (timers.push({ fn, time }), timers.length),
    cancel() {},
  });
  return {
    app,
    memory,
    records,
    writes,
    timers,
    sdk,
    get save() {
      return current;
    },
    set save(s) {
      current = s;
    },
    setUser: (u) => (session = u ? { user: u } : null),
    offline: (v) => (offline = v),
    onRead: (fn) => (readHook = fn),
    onWrite: (fn) => (writeHook = fn),
  };
}
test("only public browser keys are accepted", () => {
  assert.equal(checkCloudConfig(config).ready, true);
  assert.equal(checkCloudConfig({}).ready, false);
  assert.equal(
    checkCloudConfig({ ...config, publishableKey: "sb_secret_never_public" })
      .ready,
    false,
  );
  assert.equal(
    checkCloudConfig({ ...config, supabaseUrl: "http://insecure.test" }).ready,
    false,
  );
  const token = (role) =>
    "eyJx." + btoa(JSON.stringify({ role })) + ".signature";
  assert.equal(
    checkCloudConfig({ ...config, publishableKey: token("service_role") })
      .ready,
    false,
  );
  assert.equal(
    checkCloudConfig({ ...config, publishableKey: token("anon") }).ready,
    true,
  );
});
test("remembered sessions restore the account story without uploading guest progress", async () => {
  const h = harness(),
    remote = freshSave();
  remote.completed["first-light"] = { stars: 2, quality: 80 };
  h.records.set(userA.id, { payload: remote, revision: 3 });
  await h.app.start();
  assert.equal(h.app.user.id, userA.id);
  assert.deepEqual(h.save, remote);
  assert.equal(h.writes.length, 0);
  assert.equal(h.app.meta.revision, 3);
});
test("local changes save privately and advance a revision", async () => {
  const h = harness();
  await h.app.start();
  h.save.completed["first-light"] = { stars: 2, quality: 80 };
  h.app.changed();
  await h.app.sync();
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].id, userA.id);
  assert.equal(h.app.meta.revision, 1);
  assert.equal(h.app.meta.dirty, false);
});
test("offline changes remain pending and sync when the connection returns", async () => {
  const h = harness();
  await h.app.start();
  h.offline(true);
  h.save.discoveries.push("water-spread");
  h.app.changed();
  assert.equal(await h.app.sync(), false);
  assert.equal(h.app.meta.dirty, true);
  assert.equal(h.writes.length, 0);
  h.offline(false);
  await h.app.sync();
  assert.deepEqual(h.records.get(userA.id).payload.discoveries, [
    "water-spread",
  ]);
  assert.equal(h.app.meta.dirty, false);
});
test("another device’s edit causes a conflict without overwriting either story", async () => {
  const h = harness();
  await h.app.start();
  h.save.discoveries.push("light-focus");
  h.app.changed();
  const remote = freshSave();
  remote.discoveries.push("wind-flow");
  h.records.set(userA.id, { payload: remote, revision: 1 });
  await h.app.sync();
  assert.equal(h.app.phase, "conflict");
  assert.equal(h.writes.length, 0);
  assert.deepEqual(h.save.discoveries, ["light-focus"]);
  await h.app.resolveConflict("cloud");
  assert.deepEqual(h.save.discoveries, ["wind-flow"]);
  assert.ok(
    h.memory.get(accountSaveKey(userA.id) + ":backup").includes("light-focus"),
  );
});
test("choosing the device version uses a checked revision", async () => {
  const h = harness();
  await h.app.start();
  h.save.discoveries.push("light-focus");
  h.app.changed();
  h.records.set(userA.id, { payload: freshSave(), revision: 5 });
  await h.app.sync();
  await h.app.resolveConflict("device");
  assert.deepEqual(h.records.get(userA.id).payload.discoveries, [
    "light-focus",
  ]);
  assert.equal(h.records.get(userA.id).revision, 6);
});
test("switching accounts never copies the previous account into the next", async () => {
  const h = harness();
  await h.app.start();
  h.save.discoveries.push("fire-focus");
  h.app.changed();
  await h.app.sync();
  h.setUser(userB);
  await h.app.acceptSession({ user: userB }, "SIGNED_IN");
  assert.deepEqual(h.save.discoveries, []);
  assert.equal(h.app.meta.revision, 0);
  assert.equal(h.writes.filter((w) => w.id === userB.id).length, 0);
  await h.app.signOut();
  assert.equal(h.app.user, null);
  assert.deepEqual(h.save.discoveries, []);
});
test("edits made during a cloud write stay pending instead of being lost", async () => {
  const h = harness();
  await h.app.start();
  h.save.discoveries.push("light-focus");
  h.app.changed();
  h.onWrite(async () => {
    h.save.discoveries.push("water-flow");
    h.app.changed();
    h.onWrite(null);
  });
  await h.app.sync();
  assert.equal(h.app.meta.dirty, true);
  await h.app.sync();
  assert.deepEqual(h.records.get(userA.id).payload.discoveries, [
    "light-focus",
    "water-flow",
  ]);
  assert.equal(h.app.meta.dirty, false);
});
test("a session switch during a fetch cannot restore the old account into the new one", async () => {
  const h = harness();
  await h.app.start();
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  h.onRead(() => gate);
  const pending = h.app.sync();
  h.setUser(userB);
  h.onRead(null);
  await h.app.acceptSession({ user: userB }, "SIGNED_IN");
  release();
  await pending;
  assert.equal(h.app.user.id, userB.id);
  assert.equal(h.app.meta.revision, 0);
});
