# Ink & Wonder — A Witch’s Atelier

An illustrated, pen-first adventure inspired by Witch Hat Atelier: three chapters, twelve encounters, nineteen spell steps, and an epilogue. Version 3 adds an attributed 83-entry symbol atlas, compound drawing recognition, and a paged screen-fit interface. Remembered accounts and private cloud saves use Supabase.

## Play the local build

- **Without installing anything:** open `dist/play.html` in a modern browser, or double-click `Play Ink and Wonder.cmd` on Windows. Keep the `assets` directory beside the HTML file. This edition bundles the same game source so local file loading does not depend on JavaScript modules.
- **Web preview:** run `node server.cjs`, then visit **http://localhost:4173/**. Node 22 or newer is recommended for development. The web edition supports installation and offline caching.
- **Tablet installation after hosting:** open in Chrome on Android and use Install app / Add to Home screen, or Safari on iPad → Share → Add to Home Screen. Installation needs HTTPS, except on localhost.

Guest saves in the web edition, direct-file edition, and GitHub URL have separate browser storage. Export/import a save in Settings to move a guest story. Once the Supabase project is configured, signed-in users can sync their account story between web browsers and devices.

## Accounts and cloud saves

Use **Sign in** on the title screen or the account icon in the game. Accounts support signup, email confirmation, password login, remembered sessions, password recovery, and local sign-out. Guest play remains available. Guest progress is never silently assigned to an account: the account screen offers an explicit import. Each account has its own offline cache, separate from the guest story.

Cloud saves use database-enforced user isolation and checked revision numbers. Offline edits remain pending and retry when the connection returns. If two devices have edited the story, choose the cloud or device version; choosing the cloud version preserves a downloadable device backup. See [Supabase setup and verification](supabase/README.md) for configuration, email-delivery requirements, and security details. The current connection values live in `dist/cloud-config.js` and must contain only a project URL and public publishable key.

## The game

**The first line:** learn light, water, wind, and warmth at the atelier. **Beyond the doorstep:** help a village with bridge lamps, rain, a stalled mill, and an evening market. **The forgotten sky:** use compound spells to restore a forest observatory, ending with a four-seal finale.

Every encounter has an introduction, a task with visible world changes, an ending, a keepsake, and a memory page. Completed encounters unlock the next. Replay for up to three mastery stars. Three stars require 85% clarity and drawing without the trace guide; guided play can still finish the entire story.

The **free drawing studio** reads the actual ink, independently of the reference controls. Its atlas contains 36 sigil entries and 47 sign entries from the Independent Witch Hat Atelier Wiki. 81 have study drawings; Gryphon and Pegasus remain explicitly unpublished. Source links, community naming, and uncertain functions are shown separately from documented shapes. Derived centerlines and their attribution are in `dist/assets/glyph-attribution.md`.

Choose a reference with two sigils, mixed signs, a shared ring, nested rings or separate rings. Change sign count and inversion, or draw a new arrangement freely. Recognized compositions produce a bounded game visualization. Strict study mode withholds uncertain effects; optional interpretations are explicitly game approximations. Unknown functions never gain an invented canonical effect. Save up to forty named spells or sketches, reopen them, and export drawings as PNGs.

The document does not scroll. Journey chapters, grimoire collections and the searchable atlas use page controls. The drawing desk keeps its canvas, tools, feedback and cast button together. Portrait tablets put tools under the canvas; Expand gives drawing the full screen.

The illustrated scenes include an atelier, village, and twilight observatory. Code-native objects animate in response to your spells. Compound encounters change in stages. Graphics use pressure-sensitive ink, soft procedural audio, and motion settings, without runtime game libraries or external network requests.

## Drawing controls

- Pen, finger, or mouse. Pen pressure affects ink width.
- Optional **Pen only** setting for reliable palm rejection. Automatic rejection also gives a pen priority over accidental touch input.
- Undo, redo, whole-stroke eraser, clear page, optional trace guide, and an expandable drawing desk.
- Close a readable ring to awaken the spell, or disable automatic casting and use **Awaken spell**.
- Keyboard: **P** pen; **E** eraser; **Ctrl/⌘ Z** undo; **Shift Ctrl/⌘ Z** redo; **Space** cast.
- Settings include sound, reduced motion, larger text, installation guidance, and save export/import.

Enclosing rings define the drawing coordinate systems. Recognition accepts connected ring arcs, modest oval distortion, reordered strokes and natural pen wobble. It rejects unclear or outside ink rather than choosing the selected reference. This is an unofficial study game, not a claim to reproduce every rule or unpublished spell in the manga. The campaign is an original fan story.

## Checks and development

Guest gameplay needs no external service. Account sign-in loads a locally bundled official Supabase client. Package versions are pinned; the lockfile is committed. Development uses LinkeDOM for DOM tests, embedded PostgreSQL for database-policy tests, and esbuild for the browser SDK bundle.

```sh
npx pnpm@11.25.0 install --frozen-lockfile --ignore-scripts
npm run build
npm test
npm start
```

Or use `node scripts/build-standalone.mjs`, `node --test tests/*.test.js`, and `node server.cjs` directly after installing the test dependency.

The 50 automated checks cover the complete campaign, free drawing, input and offline behavior, plus signup/login/recovery screens, remembered sessions, per-account isolation, offline sync, and two-device conflicts. The actual SQL schema is also tested in embedded PostgreSQL for ownership policies, anonymous access denial, malformed saves, and revision checks. Canvas/device APIs and remote Auth are mocked in DOM tests. **Real browser layout, actual tablet pressure, device installation, and live email delivery still need hands-on verification**; browser inspection was unavailable in this session.

The source is separated into `data.js` (story), `engine.js` (geometry), `state.js` (saves/progression), `drawing.js` (input), `world.js` (objects/effects), `cloud.js` (accounts/sync), and `game.js` (screens/interactions). Run `npm run build` after source edits. Artwork preparation uses Pillow; font bundling uses Node. Neither is needed to play.

## GitHub hosting — prepared for later

`.github/workflows/pages.yml` deploys on pushes to **main** and can also be triggered manually. It installs pinned dependencies, builds the SDK and direct-file edition, validates the public cloud configuration, runs the checks, and uploads `dist`. Publication with accounts enabled requires the real public Supabase configuration first; private keys are rejected.

When ready:

1. Put this project in the intended GitHub repository.
2. In repository Settings → Pages, select **GitHub Actions** as the source.
3. Run **Publish Ink and Wonder** from the Actions tab on the intended branch.
4. Open the resulting deployment URL on your tablet. Export/import saves when changing origins.

Assets, module imports, the web manifest, and the service worker use relative paths, including for a repository URL such as `username.github.io/repository/`. The local `.openai` manifest belongs to the earlier prototype host and is not required by GitHub Pages.

Workflow reference: [GitHub’s custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Art and fan-story notes

This is an unofficial fan game, not an official adaptation. Story dialogue, Bellweather, the observatory, directional exercises, and practice seals are original game adaptations. The source concept of casting seals drawn with special tools is described on the [official anime website](https://tongari-anime.com/en/).

Original environments were created using built-in image generation. Full prompts and asset locations are recorded in [ART.md](ART.md). The bundled Cormorant Garamond and DM Sans fonts include their OFL license files in `dist/assets/fonts`.


## Spell studies (2.2)

The drawing vocabulary now uses geometric study redraws of Fire, Water, Earth, Wind and Light, with Columns, Levitation and Dispersion. The former sun/droplet/flame icons and invented gathering diamond are retired. Existing saved sketches remain viewable. The campaign is still an original fan story, not a manga retelling.

Reference checks: *Witch Hat Atelier* chapter 5 opening page (primary tetrad), chapter 3 page 10 (light), volume 1 extra “Introduction to Casting Seals” (seal components and signs), and chapter 46 pages 9–10 (proportions). Visual references were inspected through the [Independent Wiki sigil index](https://witchhatatelier.telepedia.net/wiki/Sigils_Explained) and [sign index](https://witchhatatelier.telepedia.net/wiki/Signs_Explained), which cite manga chapters. Unknown properties are not treated as established rules. These redraws are not scans, official assets, or a claim to reproduce the complete system.

The studio interprets mixed signs and sigil proportions, accepts connected ring arcs and modest ovals, and rejects unrecognized sketches without preventing their storage. Multiple elemental sigils in one ring, nested seals, conditional spells, decorative sigils, and the remaining manga vocabulary are not simulated. Particle motion and numerical intensity are game approximations.

Background music is an original procedural pentatonic composition, generated locally with Web Audio after a user gesture. It pauses on hidden tabs and can be disabled independently of spell sounds. Drawing stores original pressure samples while rendering quadratic joins; coalesced samples, final pen-up points and hardware erasers are supported.
