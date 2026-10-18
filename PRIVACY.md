# Privacy and publication

The public website contains game code, original artwork, fonts, and a Supabase project URL and publishable key. The publishable key is designed for browser use; it does not give anonymous visitors access to private saves.

Game saves are stored in Supabase under each authenticated user's ID. Database row-level security restricts reads and writes to that user. Account emails and passwords are handled by Supabase Auth and are not embedded in website files or stored in the public repository. Display names and account emails appear only in the signed-in user's account interface, not in the static public page.

The public page uses a no-referrer policy for outgoing requests and links. This limits referrer disclosure; it does not conceal the hosting provider or public repository history.

The game does not include analytics, public player profiles, leaderboards, or a public list of accounts. Signing in and syncing sends account information and game progress to the configured Supabase project. Guest saves remain in the browser. Browser caches and remembered sessions are not encrypted against someone with access to the same browser profile; sign out on shared devices.

Publication uses a clean source export. It excludes local saves, environment files, credentials, private chat/hosting metadata, workstation paths, local archives, and previous local Git history. Future source commits use a project-only name and an unlinked `.invalid` email address.

Earlier GitHub publications used an account-linked noreply address. A noreply address hides a private email address, but does not hide the GitHub account. Public commit attribution, contributors, Actions actors, repository ownership, and old personal Pages URLs can identify the publisher. A clean website bundle alone does not remove these links. Existing public history remains exposed until repository access changes; changing future commit identity does not rewrite earlier history.

Privacy hardening is not a guarantee of anonymity. Hosting and account providers retain account records, and prior public copies, caches, archives, forks or third-party indexes may retain identifying links after the originals become private. A GitHub Pages address also identifies GitHub as the hosting platform.

Font attribution and license files retain their authors' already-public attribution notices.
