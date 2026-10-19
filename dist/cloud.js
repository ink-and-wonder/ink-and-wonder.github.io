import { SAVE_KEY, freshSave, validateSave } from "./state.js?v=3.3.0";

export const accountSaveKey = (id) =>
  id ? `${SAVE_KEY}:user:${id}` : SAVE_KEY;
export const hasStory = (save) =>
  !!(
    Object.keys(save.completed).length ||
    save.seals.length ||
    save.discoveries.length
  );
export function checkCloudConfig(config) {
  if (!config?.supabaseUrl && !config?.publishableKey)
    return { ready: false, reason: "Cloud saves have not been connected yet." };
  let url;
  try {
    url = new URL(config.supabaseUrl);
  } catch {
    return { ready: false, reason: "The cloud project URL is invalid." };
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    return { ready: false, reason: "Use the HTTPS project URL from Supabase." };
  const key = config.publishableKey || "";
  if (key.startsWith("sb_secret_") || key.includes("service_role"))
    return {
      ready: false,
      reason:
        "A private database key cannot be used in the browser. Use the public publishable key.",
    };
  let publicKey = key.startsWith("sb_publishable_") && key.length > 25;
  if (key.startsWith("eyJ"))
    try {
      const payload = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      publicKey = payload.role === "anon";
    } catch {}
  return publicKey
    ? { ready: true, url: url.origin, key }
    : {
        ready: false,
        reason:
          "Use a Supabase publishable key or legacy anon key, never a secret/service-role key.",
      };
}
export function cloudError(error) {
  const message = String(error?.message || "");
  if (
    error?.code === "42P01" ||
    /relation .*does not exist|could not find the table|could not find the function/i.test(
      message,
    )
  )
    return "The cloud database needs its setup script. Run supabase/schema.sql in your project.";
  if (
    error?.code === "42501" ||
    /row.level security|permission denied/i.test(message)
  )
    return "The cloud database permissions need checking. Your device copy is safe.";
  if (/invalid login credentials/i.test(message))
    return "The email or password did not match. Please try again.";
  if (/email not confirmed/i.test(message))
    return "Confirm your email first, then sign in here.";
  if (
    /email address not authorized|email.*rate limit|over_email_send_rate_limit/i.test(
      message,
    ) ||
    error?.status === 429
  )
    return "Email delivery is limited by the project. Try again later or ask the game owner to check the email setup.";
  if (/fetch|network|offline|timeout|aborted/i.test(message))
    return "Cloud connection unavailable. Your story is kept on this device; reconnect to sync.";
  if (/database.*paused|project.*paused/i.test(message))
    return "The database is paused. Resume the free project in Supabase, then retry.";
  if (/password/i.test(message))
    return "Please use a password of at least 8 characters that meets the account requirements.";
  return "The cloud request could not finish. Your device copy is safe. Please try again.";
}

export class CloudAccount {
  constructor({
    config,
    storage,
    getSave,
    onIdentity = () => {},
    onSave = () => {},
    onStatus = () => {},
    onRecovery = () => {},
    loadClient = () => import("./vendor/supabase.js"),
    isWeb = () => typeof location !== "undefined" && /^https?:$/.test(location.protocol),
    schedule = setTimeout,
    cancel = clearTimeout,
  }) {
    this.config = checkCloudConfig(config);
    this.storage = storage;
    this.getSave = getSave;
    this.onIdentity = onIdentity;
    this.onSave = onSave;
    this.onStatus = onStatus;
    this.onRecovery = onRecovery;
    this.loadClient = loadClient;
    this.isWeb = isWeb;
    this.schedule = schedule;
    this.cancel = cancel;
    this.user = null;
    this.client = null;
    this.phase = this.config.ready ? "guest" : "unconfigured";
    this.message =
      this.config.reason ||
      "Play as a guest or sign in to save across devices.";
    this.epoch = 0;
    this.version = 0;
    this.meta = { revision: 0, dirty: false };
    this.timer = null;
    this.task = null;
    this.conflict = null;
    this.startTask = null;
  }
  get info() {
    return {
      configured: this.config.ready,
      user: this.user,
      phase: this.phase,
      message: this.message,
      pending: this.meta.dirty,
      conflict: this.conflict,
    };
  }
  status(phase, message) {
    this.phase = phase;
    this.message = message;
    this.onStatus(this.info);
  }
  writeMeta() {
    try {
      this.storage.setItem(
        accountSaveKey(this.user.id) + ":sync",
        JSON.stringify(this.meta),
      );
    } catch {
      this.status(
        "error",
        "Cloud sync metadata could not be saved. Export your story before closing this browser.",
      );
    }
  }
  readMeta(id) {
    try {
      const m = JSON.parse(
        this.storage.getItem(accountSaveKey(id) + ":sync") || "null",
      );
      if (m && Number.isSafeInteger(m.revision) && m.revision >= 0)
        return { revision: m.revision, dirty: m.dirty === true };
    } catch {}
    return { revision: 0, dirty: hasStory(this.getSave()) };
  }
  start() {
    if (this.startTask) return this.startTask;
    this.startTask = this.initialize();
    return this.startTask;
  }
  async initialize() {
    if (!this.config.ready) {
      this.status("unconfigured", this.config.reason);
      return;
    }
    if (!this.isWeb()) {
      this.status(
        "unavailable",
        "Open the web edition to sign in. The direct-file edition supports guest play.",
      );
      return;
    }
    try {
      this.status("loading", "Opening your account…");
      const { createClient } = await this.loadClient();
      this.subscription?.unsubscribe();
      this.client = createClient(this.config.url, this.config.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
          storageKey: "ink-wonder-auth-" + new URL(this.config.url).hostname,
        },
        global: {
          fetch: cloudFetch,
          headers: { "X-Client-Info": "ink-wonder/2.1" },
        },
      });
      const subscription = this.client.auth.onAuthStateChange(
        (event, session) => {
          // Never await another Supabase call inside its auth callback.
          this.schedule(
            () =>
              this.acceptSession(session, event).catch(() =>
                this.status(
                  "error",
                  "Could not restore the account. Please sign in again.",
                ),
              ),
            0,
          );
        },
      );
      this.subscription = subscription.data.subscription;
      const { data, error } = await this.client.auth.getSession();
      if (error) throw error;
      await this.acceptSession(data.session, "INITIAL_SESSION");
    } catch (error) {
      this.status("error", cloudError(error));
      this.startTask = null;
    }
  }
  async acceptSession(session, event) {
    const user = session?.user || null;
    if (user?.id !== this.user?.id) {
      this.epoch++;
      this.version = 0;
      this.cancel(this.timer);
      this.task = null;
      this.conflict = null;
      this.user = user;
      this.meta = { revision: 0, dirty: false };
      this.onIdentity(user);
      if (user) {
        this.meta = this.readMeta(user.id);
        await this.sync();
      } else this.status("guest", "Guest story · saved on this device");
    } else if (!user)
      this.status("guest", "Guest story · saved on this device");
    if (event === "PASSWORD_RECOVERY" && user) this.onRecovery();
  }
  async signIn(email, password) {
    await this.start();
    if (!this.client) throw Error("Account service unavailable");
    const { data, error } = await this.client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    await this.acceptSession(data.session, "SIGNED_IN");
    return data;
  }
  async signUp(email, password, name, redirectTo) {
    await this.start();
    if (!this.client) throw Error("Account service unavailable");
    const { data, error } = await this.client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: name.trim() },
        emailRedirectTo: redirectTo,
      },
    });
    if (error) throw error;
    if (data.session) await this.acceptSession(data.session, "SIGNED_IN");
    return !!data.session;
  }
  async resetPassword(email, redirectTo) {
    await this.start();
    if (!this.client) throw Error("Account service unavailable");
    const { error } = await this.client.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo },
    );
    if (error) throw error;
  }
  async updatePassword(password) {
    if (!this.client || !this.user)
      throw Error("Sign in before changing your password");
    const { error } = await this.client.auth.updateUser({ password });
    if (error) throw error;
  }
  async resendConfirmation(email, redirectTo) {
    await this.start();
    if (!this.client) throw Error("Account service unavailable");
    const { error } = await this.client.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw error;
  }
  async signOut() {
    if (!this.client) return;
    this.cancel(this.timer);
    const { error } = await this.client.auth.signOut({ scope: "local" });
    if (error) throw error;
    await this.acceptSession(null, "SIGNED_OUT");
  }
  changed() {
    if (!this.user) return;
    this.version++;
    this.meta.dirty = true;
    this.writeMeta();
    if (this.conflict) {
      this.status("conflict", "Two versions of your story need a choice.");
      return;
    }
    this.status("pending", "Saved on this device · waiting to sync");
    this.cancel(this.timer);
    this.timer = this.schedule(() => this.sync(), 900);
  }
  async readRemote(userId) {
    const { data, error } = await this.client
      .from("game_saves")
      .select("payload,revision,updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    if (!Number.isSafeInteger(data.revision) || data.revision < 1)
      throw Error("Invalid cloud revision");
    return { ...data, payload: validateSave(data.payload) };
  }
  sync() {
    if (!this.client || !this.user || this.conflict)
      return Promise.resolve(false);
    if (this.task) return this.task;
    const epoch = this.epoch;
    this.task = this.syncOnce(epoch).finally(() => {
      if (epoch !== this.epoch) return;
      this.task = null;
      if (this.meta.dirty && this.phase === "pending")
        this.timer = this.schedule(() => this.sync(), 900);
    });
    return this.task;
  }
  async syncOnce(epoch) {
    const userId = this.user.id;
    this.status("syncing", "Saving your story to the cloud…");
    try {
      const remote = await this.readRemote(userId);
      if (epoch !== this.epoch) return false;
      const revision = remote?.revision || 0;
      if (this.meta.dirty) {
        if (revision !== this.meta.revision) {
          this.setConflict(remote);
          return false;
        }
        const payload = validateSave(this.getSave()),
          sentVersion = this.version;
        if (
          new TextEncoder().encode(JSON.stringify(payload)).length > 7_500_000
        )
          throw Error("Cloud save too large");
        const { data, error } = await this.client.rpc("commit_game_save", {
          expected_revision: revision,
          new_payload: payload,
        });
        if (epoch !== this.epoch) return false;
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : null;
        if (!row) {
          const latest = await this.readRemote(userId);
          if (epoch === this.epoch) this.setConflict(latest);
          return false;
        }
        if (!Number.isSafeInteger(row.revision) || row.revision <= revision)
          throw Error("Invalid cloud revision");
        this.meta = {
          revision: row.revision,
          dirty: this.version !== sentVersion,
        };
        this.writeMeta();
        this.status(
          this.meta.dirty ? "pending" : "saved",
          this.meta.dirty
            ? "Saving your latest changes…"
            : "Your story is safe in the cloud",
        );
        return true;
      }
      if (remote) {
        this.onSave(remote.payload);
        this.meta = { revision, dirty: false };
        this.writeMeta();
        this.status("saved", "Your story is safe in the cloud");
      } else {
        this.meta = { revision: 0, dirty: false };
        this.writeMeta();
        this.status("ready", "Cloud ready · your next moment will be saved");
      }
      return true;
    } catch (error) {
      if (epoch !== this.epoch) return false;
      this.status(
        "error",
        /too large/i.test(error?.message)
          ? "This grimoire is too large to sync. Export a backup and remove a few pages."
          : cloudError(error),
      );
      return false;
    }
  }
  setConflict(remote) {
    this.conflict = { remote, local: validateSave(this.getSave()) };
    this.status(
      "conflict",
      "This story changed on another device. Choose which version to keep.",
    );
  }
  async resolveConflict(choice) {
    if (!this.conflict || !this.user) return;
    const { remote } = this.conflict;
    if (choice === "cloud") {
      // Keep the displaced device copy recoverable, including experimental pages.
      this.storage.setItem(
        accountSaveKey(this.user.id) + ":backup",
        JSON.stringify(validateSave(this.getSave())),
      );
      this.conflict = null;
      this.version++;
      this.onSave(remote?.payload || freshSave());
      this.meta = { revision: remote?.revision || 0, dirty: false };
      this.writeMeta();
      this.status(
        "saved",
        "Loaded the cloud story · the device copy is backed up locally",
      );
    } else if (choice === "device") {
      this.conflict = null;
      this.meta = { revision: remote?.revision || 0, dirty: true };
      this.writeMeta();
      await this.sync();
    } else throw Error("Choose a story version");
  }
  destroy() {
    this.epoch++;
    this.cancel(this.timer);
    this.subscription?.unsubscribe();
  }
}

export async function cloudFetch(input, options = {}) {
  const controller = new AbortController(),
    abort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(
    () => controller.abort(Error("Network timeout")),
    15000,
  );
  try {
    return await fetch(input, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
