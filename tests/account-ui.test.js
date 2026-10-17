import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { parseHTML } from "linkedom";
test("account screens submit signup, login, recovery, and signout without storing passwords", async () => {
  const html = fs.readFileSync(
    new URL("../dist/play.html", import.meta.url),
    "utf8",
  );
  let code = html.match(/<script>\s*([\s\S]+)<\/script>/)[1];
  code = code.replace(
    /const CLOUD_CONFIG\s*=\s*Object\.freeze\(\{[\s\S]*?\}\);/,
    `const CLOUD_CONFIG={supabaseUrl:'https://example.supabase.co',publishableKey:'sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'};`,
  );
  code = code.replace(
    /loadClient\s*=\s*\(\)\s*=>\s*import\(["']\.\/vendor\/supabase\.js["']\)/,
    "loadClient=()=>Promise.resolve({createClient:()=>globalThis.__SDK})",
  );
  const { window, document } = parseHTML(html),
    memory = new Map(),
    calls = [];
  let session = null,
    authCallback;
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "you@example.test",
    user_metadata: { display_name: "<img src=x> Apprentice" },
  };
  window.scrollTo = () => {};
  window.HTMLInputElement.prototype.select = () => {};
  const dialog = document.querySelector("#dialog");
  dialog.showModal = () => (dialog.open = true);
  dialog.close = () => (dialog.open = false);
  const timers = [],
    context = {
      window,
      document,
      URL,
      TextEncoder,
      AbortController,
      structuredClone,
      performance,
      crypto,
      navigator: {},
      location: {
        protocol: "https:",
        href: "https://example.github.io/ink-and-wonder/",
      },
      localStorage: {
        getItem: (k) => memory.get(k) || null,
        setItem: (k, v) => memory.set(k, v),
      },
      sessionStorage: { getItem: () => null, setItem() {} },
      matchMedia: () => ({ matches: false }),
      setTimeout: (fn, time) => (timers.push({ fn, time }), timers.length),
      clearTimeout() {},
      requestAnimationFrame: () => 1,
      cancelAnimationFrame() {},
      ResizeObserver: class {
        observe() {}
        disconnect() {}
      },
    };
  context.__SDK = {
    auth: {
      onAuthStateChange: (fn) => (
        (authCallback = fn),
        { data: { subscription: { unsubscribe() {} } } }
      ),
      getSession: async () => ({ data: { session } }),
      signUp: async (data) => (
        calls.push(["signup", data]),
        { data: { session: null } }
      ),
      signInWithPassword: async (data) => (
        calls.push(["signin", data]),
        (session = { user }),
        { data: { session } }
      ),
      resetPasswordForEmail: async () => {
        calls.push(["reset"]);
        return {};
      },
      updateUser: async () => {
        calls.push(["update-password"]);
        return {};
      },
      resend: async () => ({}),
      signOut: async () => {
        session = null;
        return {};
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
      }),
    }),
  };
  vm.runInNewContext(code, context);
  const tick = async () => {
      for (let i = 0; i < 30; i++) await Promise.resolve();
    },
    $ = (s) => document.querySelector(s),
    click = (s) => {
      assert.ok($(s), s);
      $(s).click();
    },
    fill = (name, value) =>
      ($('#authForm [name="' + name + '"]').value = value),
    submit = () =>
      $("#authForm").dispatchEvent(
        new window.Event("submit", { bubbles: true, cancelable: true }),
      );
  await tick();
  click("#titleAccount");
  click('[data-account="signup"]');
  fill("displayName", "Apprentice");
  fill("email", user.email);
  fill("password", "not-a-real-password");
  submit();
  await tick();
  assert.equal(calls[0][0], "signup");
  assert.match($("#dialogBody").textContent, /letter is on its way/);
  assert.equal(
    calls[0][1].options.emailRedirectTo,
    "https://example.github.io/ink-and-wonder/",
  );
  click('[data-account="signin"]');
  fill("email", user.email);
  fill("password", "not-a-real-password");
  submit();
  await tick();
  assert.ok($("#accountDashboard"));
  assert.equal($("#accountDashboard h2 img"), null);
  assert.ok(![...memory.values()].join("").includes("not-a-real-password"));
  click('[data-account="change-password"]');
  fill("password", "another-not-real-password");
  submit();
  await tick();
  assert.ok(calls.some((c) => c[0] === "update-password"));
  click('[data-account="signout"]');
  await tick();
  assert.equal($("#accountDashboard"), null);
  assert.ok($("#authForm"));
  click('[data-account="reset"]');
  fill("email", user.email);
  submit();
  await tick();
  assert.ok(calls.some((c) => c[0] === "reset"));
  assert.match($("#authMessage").textContent, /reset link/);
});
