# Privacy and publication

The public website contains game code, original artwork, fonts, and a Supabase project URL and publishable key. The publishable key is designed for browser use; it does not give anonymous visitors access to private saves.

Game saves are stored in Supabase under each authenticated user's ID. Database row-level security restricts reads and writes to that user. Account emails and passwords are handled by Supabase Auth and are not embedded in website files or stored in the public repository. Display names and account emails appear only in the signed-in user's account interface, not in the static public page.

The game does not include analytics, public player profiles, leaderboards, or a public list of accounts. Signing in and syncing sends account information and game progress to the configured Supabase project. Guest saves remain in the browser. Browser caches and remembered sessions are not encrypted against someone with access to the same browser profile; sign out on shared devices.

The initial GitHub publication uses a clean source export and a GitHub noreply commit identity. It excludes local saves, environment files, credentials, private chat/hosting metadata, workstation paths, local archives, and previous local Git history. The repository owner's GitHub handle remains visible as part of a public repository's URL.

Font attribution and license files retain their authors' already-public attribution notices.
