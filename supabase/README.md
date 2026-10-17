# Account and cloud-save setup

The game uses Supabase Auth plus one Postgres table. The public website can stay on GitHub Pages; no custom server or database password is needed in the website.

## Project setup

1. Create a **Free** Supabase project in the chosen organization. Use a nearby region, such as Mumbai (`ap-south-1`) for India. Do not enable paid compute or create a paid organization for this game.
2. Inspect the project's existing tables. Run `schema.sql` in its SQL Editor for a fresh game project. It creates `public.game_saves` and the `commit_game_save` function, enables row-level security, and grants only authenticated users access to their own row.
3. Get the **project URL** and **publishable API key** from the project settings. Put only those public values in `dist/cloud-config.js`. Never put a secret key, service-role key, database password, or management token in browser code or GitHub.
4. In Authentication → URL Configuration, set the Site URL to the deployed game's repository URL, including its trailing slash. Add that exact URL and `http://localhost:4173/` as allowed redirects. The app computes its callback from its current origin and directory, so it works under a GitHub repository subpath.
5. Keep email confirmation enabled. Configure custom SMTP before inviting players: Supabase's default sender is for testing, restricts recipients to organization team members, and currently has a small hourly limit. The database/Auth free plan does not automatically provide unrestricted production email delivery. See [Supabase's email setup guide](https://supabase.com/docs/guides/auth/auth-smtp).
6. Build with `npm run build`, run `npm test`, and sign up using an email you own. Confirm the email, sign in, finish a moment, then sign in on a second browser to verify restoration. Password-reset links should be opened in the same browser that requested them for the PKCE exchange.

The direct-file `play.html` edition remains a guest review edition; use HTTP/HTTPS for account sign-in. Guest play is still available without an account or internet after the assets load.

## Data model and isolation

- `auth.users` is managed by Supabase; the game does not store passwords.
- `game_saves.user_id` is the primary key and references the authenticated user.
- `payload` stores validated version-2 game progress, settings, discoveries, and named seals/sketches. It does not duplicate the account email or password.
- `revision` is an optimistic concurrency counter. `commit_game_save` inserts or updates only when its expected revision still matches. A second device cannot silently replace a newer save.
- `updated_at` records the server-side write time.

Every select/update/delete policy restricts rows to `auth.uid() = user_id`. Insert/update checks prevent assigning a save to another user. The write function uses `SECURITY INVOKER`, a fixed search path, and an authenticated-only execute grant. No privileged key is bundled with the game. The primary key also indexes the owner predicate.

Local browser storage is separated into a guest save and an account-specific cache. Signing in does not automatically upload someone else's guest story. The account screen offers an explicit guest import. Signing out returns to the guest story. Pending writes survive offline play and are retried on reconnect. Local browser data is not encrypted; use Sign out on shared devices, and do not share browser profiles.

If both devices have changed, the account screen asks which version to keep. Choosing the cloud story first retains the displaced device copy as a downloadable local backup. There is no automatic merge that might resurrect deleted sketches.

## Verification

`tests/database.test.js` applies the actual schema to embedded PostgreSQL and verifies two-user row isolation, anonymous access denial, malformed payload rejection, and revision checks. `tests/cloud.test.js` exercises remembered sessions, offline retry, two-device conflicts, account switching, and writes racing with local edits.

These automated tests complement a live smoke test; they do not send signup emails or test a real project's email delivery. After deployment, inspect Supabase's security advisors and verify that anonymous REST access is denied.

## Cost

Use the organization's quoted **Free** plan. Quotas, inactivity pauses, and email limits can change; review [Supabase pricing](https://supabase.com/pricing) before launch. The browser build does not upgrade a plan, change billing, or provision paid resources.
