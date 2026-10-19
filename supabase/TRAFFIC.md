# Private traffic totals

Run `traffic.sql` after the account schema. It adds only `site_traffic_daily`, a private summary view and the fixed anonymous increment function. It does not alter account or save permissions.

The table stores **only a day and a page-view total**. No visitor records, IP addresses, identifiers, user agents, referrers, paths, emails or login tokens are stored by this feature. Provider-level operational logs are separate. The browser honors Global Privacy Control, Do Not Track and Settings → Privacy opt-out. It sends one request per visible production page load, with credentials omitted, an empty JSON body and no referrer. Preview and direct-file editions do not count. There are no network retries, to avoid duplicate increments after uncertain responses.

## Read the dashboard

Sign into the Supabase project and run the saved private **Ink & Wonder — Traffic overview** query. Click Run to refresh. It selects `public.site_traffic_dashboard`: today, the last seven calendar days, the last thirty calendar days and all time. Days use Asia/Kolkata. `public.site_traffic_daily` provides the daily breakdown. The saved private dashboard link is provided separately, not included in the public game.

These are page views, **not unique people or verified human visitors**. Reloads and automated/spoofed requests can increase totals; opt-outs, blockers, offline use and network failures can reduce them. No history before installation exists. Without visitor identifiers or a tracking service, this deliberately does not claim deduplicated visitors, geography, sources or session duration.

## Access boundary

Traffic tables and the summary view deny direct access to anonymous visitors and ordinary authenticated game accounts. Project database administrators may read them through the private Supabase dashboard. The application never embeds an admin/service-role key.

The anonymous `record_site_pageview()` RPC intentionally uses SECURITY DEFINER so it can increment today's row while visitors have no table privileges. Its body has no caller-controlled arguments, a pinned empty search path, fully qualified table names, a fixed origin check, a server-derived day and no returned data. PUBLIC and authenticated execution grants are revoked; only the anonymous role used by the dedicated counter request may execute. The security advisor's anonymous SECURITY DEFINER warning is expected for this narrowly scoped write-only endpoint. The origin check is a browser safeguard, not authentication or rate limiting. Treat the resulting totals as approximate.
