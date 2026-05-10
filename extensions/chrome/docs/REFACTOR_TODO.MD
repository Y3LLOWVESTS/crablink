Below is a **proposed target refactor tree** for CrabLink’s Chrome extension, designed around the rules from the carryover notes and `CRABLINK_REFACTOR.MD`: **one route = one page owner**, page folders per built-in `crab://` site, shared shell/theme/ad/manifest systems, and no more late DOM patching or MutationObserver rescue logic. The current codebundle shows the existing `page-*` sprawl and extension scripts, while the refactor notes explicitly call out the need to move toward folder-based ownership, shared router/shell, and a uniform manifest builder.  

My recommendation: **React + Vite for the full-tab CrabLink browser UI**, while keeping Chrome extension glue—`background`, `content`, `popup`, and `options`—plain MV3 JavaScript. That gives us clean mount/unmount behavior, shared components, a real route registry, better UX polish, and less manual DOM patching, while avoiding Next.js or heavy framework bloat. The notes already identify React + Vite as the likely better path for the full-tab app, with background/content glue remaining vanilla. 

---

# Proposed refactor file tree

```text
crablink/
  README.md
  CHANGELOG.md
  SECURITY.md
  CONTRIBUTING.md
  package.json
  vite.config.js

  docs/
    CRABLINK_REFACTOR_PLAN.md
    ROUTE_CONTRACTS.md
    MANIFEST_MODEL.md
    THEME_AND_AD_SLOT.md
    SANDBOX_MODEL.md
    TESTING_MATRIX.md

  shared/
    js/
      crab.js
      errors.js
      ids.js
      ronClient.js
      storageSchema.js
    schemas/
      asset-page.schema.json
      extension-settings.schema.json
      identity-me.schema.json
      passport-bootstrap.schema.json
      problem.schema.json
      public-profile.schema.json
      site-page.schema.json
      wallet-balance.schema.json
      uniform-manifest.schema.json
      rendition-group.schema.json
    fixtures/
      asset-page.sample.json
      identity-me.empty.sample.json
      identity-me.ready.sample.json
      passport-bootstrap.sample.json
      problem.not-found.json
      problem.policy-denied.json
      public-profile.confirmed.sample.json
      site-page.sample.json
      wallet-balance.sample.json
      uniform-manifest.sample.json
      rendition-group.sample.json

  extensions/
    chrome/
      manifest.json
      README.md

      docs/
        blueprint.md
        CREATOR_WORKSPACES.MD

      assets/
        icons/
          icon16.png
          icon32.png
          icon48.png
          icon128.png
          logo.png

      src/
        background.js
        content.js

        popup.html
        popup.js

        options.html
        options.js
        options-first-run-polish.js

        page.html
        page.js

        crab.js
        ronClient.js
        storage.js

        app/
          main.jsx
          App.jsx
          appContext.js
          appEvents.js
          appState.js
          settings.js
          routeRegistry.js
          router.js
          shell/
            Shell.jsx
            TopBar.jsx
            AddressBar.jsx
            BrowserNav.jsx
            PassportChip.jsx
            BalanceChip.jsx
            CreatorChip.jsx
            HeaderAdSlot.jsx
            ToastHost.jsx
            ModalHost.jsx
            Shell.css

        shared/
          api/
            gatewayClient.js
            identityClient.js
            walletClient.js
            assetClient.js
            siteClient.js
          components/
            ActionBar.jsx
            Badge.jsx
            Button.jsx
            Card.jsx
            CopyButton.jsx
            EmptyState.jsx
            ErrorPanel.jsx
            Field.jsx
            FilePicker.jsx
            JsonPreview.jsx
            LoadingState.jsx
            Modal.jsx
            PageHeader.jsx
            SegmentedControl.jsx
            StatChip.jsx
            TextArea.jsx
            TextInput.jsx
            Toggle.jsx
            TruthBoundary.jsx
          embed/
            embedRegistry.js
            crabImageEmbed.jsx
            crabVideoEmbed.jsx
            crabAudioEmbed.jsx
            crabArticleEmbed.jsx
            crabPostEmbed.jsx
            crabCommentEmbed.jsx
            safeHtml.js
            sandboxFrame.js
          manifest/
            uniformManifest.js
            manifestDrafts.js
            manifestForm.jsx
            manifestSections.jsx
            manifestPreview.jsx
            renditionGroups.js
            linkedAssets.js
            versionHistory.js
            rightsPolicy.js
            accessPolicy.js
            economicsPolicy.js
            provenance.js
          theme/
            themeStore.js
            ThemeProvider.jsx
            themeTokens.css
            light.css
            dark.css
          utils/
            crabUrl.js
            b3.js
            clipboard.js
            dom.js
            events.js
            format.js
            nonce.js
            validation.js
            viewMode.js
          styles/
            base.css
            layout.css
            forms.css
            cards.css
            modals.css
            developer.css

        pages/
          home/
            HomePage.jsx
            HomeQuickActions.jsx
            home.css

          site/
            SitePage.jsx
            SiteCreate.jsx
            SiteRender.jsx
            SiteManifestDrawer.jsx
            SiteCreatorProof.jsx
            SiteRootUpload.jsx
            site.css

          image/
            ImagePage.jsx
            ImageCreate.jsx
            ImagePreview.jsx
            ImageRenditions.jsx
            ImageManifest.jsx
            image.css

          profile/
            ProfilePage.jsx
            ProfileHome.jsx
            ProfileEditor.jsx
            ProfileAvatar.jsx
            ProfileGateway.jsx
            ProfileAssets.jsx
            AltVault.jsx
            profile.css

          music/
            MusicPage.jsx
            MusicDraft.jsx
            MusicRights.jsx
            MusicLinkedAssets.jsx
            music.css

          lyrics/
            LyricsPage.jsx
            LyricsDraft.jsx
            lyrics.css

          article/
            ArticlePage.jsx
            ArticleDraft.jsx
            article.css

          post/
            PostPage.jsx
            PostDraft.jsx
            post.css

          comment/
            CommentPage.jsx
            CommentDraft.jsx
            comment.css

          video/
            VideoPage.jsx
            VideoDraft.jsx
            VideoRenditions.jsx
            video.css

          stream/
            StreamPage.jsx
            StreamDraft.jsx
            StreamPodcastMode.jsx
            stream.css

          podcast/
            PodcastPage.jsx
            PodcastDraft.jsx
            podcast.css

          ad/
            AdPage.jsx
            AdCampaignDraft.jsx
            AdCreativePreview.jsx
            ad.css

          algo/
            AlgoPage.jsx
            AlgoDraft.jsx
            AlgoTransparency.jsx
            algo.css

          code/
            CodePage.jsx
            CodeDraft.jsx
            CodeFacet.jsx
            FacetContractPreview.jsx
            code.css

          game/
            GamePage.jsx
            GameDraft.jsx
            GameAssets.jsx
            game.css

          asset/
            AssetPage.jsx
            AssetResolver.jsx
            AssetHydratedView.jsx
            asset.css

          notFound/
            NotFoundPage.jsx
            notFound.css

          problem/
            ProblemPage.jsx
            problem.css

        legacy/
          README.md
          page-legacy-bridge.js

      test/
        manual-checklist.md
        fixtures/
          asset-page.sample.json
          problem.not-found.json
          problem.policy-denied.json
          site-page.sample.json

  scripts/
    check-chrome.sh
    green-gate-local.sh
    make_codebundle.sh
    package-chrome.sh
    smoke-first-run-profile.sh
    smoke-local-gateway.sh
    smoke-profile-gateway.sh
    smoke-site-create-local.sh
```

---

# File-by-file description

## Root files

### `README.md`

Top-level project overview for CrabLink: what it is, how it relates to RustyOnions, how to run checks, and how to load the Chrome extension.

### `CHANGELOG.md`

Tracks meaningful user-facing and developer-facing changes across CrabLink releases.

### `SECURITY.md`

Documents security boundaries: gateway-only access, no silent ROC spending, no direct internal service calls, no arbitrary code execution, and sandbox rules.

### `CONTRIBUTING.md`

Contributor rules, code style, testing requirements, and the “small modular files, no patch spaghetti” discipline.

### `package.json`

Defines Vite/React tooling, lint/check scripts, build scripts, and local dev commands for the full-tab browser app.

### `vite.config.js`

Build configuration for the full-tab React app. It should output extension-compatible static assets without pulling in Next.js or server assumptions.

---

## `docs/`

### `docs/CRABLINK_REFACTOR_PLAN.md`

Human-readable refactor plan: phases, migration order, risks, acceptance gates, and the rule that site/image paid flows move late.

### `docs/ROUTE_CONTRACTS.md`

Documents all built-in routes: `crab://site`, `crab://image`, `crab://profile`, `crab://music`, `crab://lyrics`, `crab://article`, `crab://post`, `crab://comment`, `crab://video`, `crab://stream`, `crab://podcast`, `crab://ad`, `crab://algo`, `crab://code`, and `crab://game`.

### `docs/MANIFEST_MODEL.md`

Defines the uniform manifest model: identity, ownership, metadata, linked assets, renditions, versions/history, rights, access, economics, provenance, receipts, and truth boundaries.

### `docs/THEME_AND_AD_SLOT.md`

Documents the global light/dark theme system and the standardized header “Ad Space” slot.

### `docs/SANDBOX_MODEL.md`

Documents CrabLink’s trusted shell vs untrusted crab content boundary, sandboxed iframe strategy, safe embeds, and future facet/sandbox rules.

### `docs/TESTING_MATRIX.md`

Defines static checks, route navigation checks, smoke tests, paid flow tests, theme/ad-slot tests, and manual browser QA.

---

## `shared/js/`

### `shared/js/crab.js`

Shared crab URL parsing and normalization helpers. This should remain framework-free and usable by extension pages, smoke scripts, and future clients.

### `shared/js/errors.js`

Shared error normalization helpers for problem JSON, gateway failures, network failures, and user-facing error copy.

### `shared/js/ids.js`

Shared ID helpers for correlation IDs, idempotency keys, local draft IDs, and stable client-side identifiers.

### `shared/js/ronClient.js`

Shared gateway HTTP client foundation. The Chrome app can wrap this, but all backend calls should remain centralized and gateway-only.

### `shared/js/storageSchema.js`

Shared settings/defaults schema for extension storage, first-run state, gateway URL, passport labels, dev flags, and safety preferences.

---

## `shared/schemas/`

### `asset-page.schema.json`

Schema for hydrated asset page responses from the gateway/omnigate path.

### `extension-settings.schema.json`

Schema for local extension settings. This is convenience state only, never backend truth.

### `identity-me.schema.json`

Schema for current identity/passport summary responses.

### `passport-bootstrap.schema.json`

Schema for first-run passport/bootstrap responses.

### `problem.schema.json`

Schema for structured problem/error responses.

### `public-profile.schema.json`

Schema for backend-confirmed public profile data.

### `site-page.schema.json`

Schema for hydrated site page responses.

### `wallet-balance.schema.json`

Schema for wallet balance display responses. CrabLink displays this but never treats local state as ledger truth.

### `uniform-manifest.schema.json`

New schema for the shared asset manifest draft shape used by all built-in creation pages.

### `rendition-group.schema.json`

New schema for image/video/media rendition sets, canonical pointers, alternates, and versioned relationships.

---

## `shared/fixtures/`

### `asset-page.sample.json`

Sample hydrated asset page for UI development and tests.

### `identity-me.empty.sample.json`

Sample identity response for a user without a configured/confirmed passport.

### `identity-me.ready.sample.json`

Sample identity response for a ready passport state.

### `passport-bootstrap.sample.json`

Sample first-run passport/bootstrap response.

### `problem.not-found.json`

Sample 404/problem response.

### `problem.policy-denied.json`

Sample policy-denied response.

### `public-profile.confirmed.sample.json`

Sample backend-confirmed profile with username/public identity fields.

### `site-page.sample.json`

Sample hydrated site page response.

### `wallet-balance.sample.json`

Sample wallet balance response.

### `uniform-manifest.sample.json`

Sample complete uniform manifest draft.

### `rendition-group.sample.json`

Sample rendition group with original, desktop, mobile, thumbnail, and canonical pointers.

---

# `extensions/chrome/`

## `extensions/chrome/manifest.json`

Chrome Manifest V3 definition. It should stay minimal: local gateway host permissions, storage, active tab behavior if needed, background service worker, options page, and full-tab page entry.

## `extensions/chrome/README.md`

Chrome-specific setup instructions: loading unpacked extension, running scripts, development workflow, and known MV3 constraints.

---

## `extensions/chrome/docs/`

### `extensions/chrome/docs/blueprint.md`

Chrome extension local blueprint. It should preserve the hard rules: thin client, gateway-only, no direct wallet/storage/index/ledger calls, no private-key custody in MVP, and explicit paid prompts.

### `extensions/chrome/docs/CREATOR_WORKSPACES.MD`

Creator UX documentation for built-in workspaces like image, site, music, video, stream, podcast, code, game, and ads.

---

## `extensions/chrome/assets/icons/`

### `icon16.png`

Small Chrome toolbar/icon asset.

### `icon32.png`

Medium icon asset for extension UI contexts.

### `icon48.png`

Chrome extension management icon.

### `icon128.png`

Chrome Web Store/package icon.

### `logo.png`

CrabLink brand mark used inside the full-tab UI and extension surfaces.

---

# Chrome MV3 glue files

## `extensions/chrome/src/background.js`

Plain MV3 service worker. Handles install defaults, opening the full-tab CrabLink browser, and lightweight extension events only.

## `extensions/chrome/src/content.js`

Plain content script. It should stay minimal and avoid broad page hijacking; later it can support user-triggered scans for crab links.

## `extensions/chrome/src/popup.html`

Small popup shell. Since the main UX is full-tab, this should remain lightweight: open CrabLink, show gateway status, and offer settings.

## `extensions/chrome/src/popup.js`

Popup behavior: read settings, check gateway status, and open the full-tab CrabLink page.

## `extensions/chrome/src/options.html`

Settings page shell for gateway URL, timeout, local dev settings, and safety toggles.

## `extensions/chrome/src/options.js`

Settings page logic. It validates and saves settings through `storage.js`.

## `extensions/chrome/src/options-first-run-polish.js`

First-run UI polish for onboarding, especially username/passport setup prompts. This can later be absorbed into the React app if options becomes React-based.

## `extensions/chrome/src/page.html`

Full-tab CrabLink browser HTML entry. It should contain only the root mount node and bundle/style references.

## `extensions/chrome/src/page.js`

Compatibility bootstrap for the full-tab page. In the final Vite version, this should become tiny or be replaced by `app/main.jsx`.

## `extensions/chrome/src/crab.js`

Chrome-local wrapper/re-export for crab URL helpers. Eventually this should point to shared code to avoid drift.

## `extensions/chrome/src/ronClient.js`

Chrome-local gateway client wrapper. Eventually this should delegate to `shared/js/ronClient.js` and only add extension-specific settings/header behavior.

## `extensions/chrome/src/storage.js`

Chrome storage adapter. Owns durable local preferences, never backend truth.

---

# `extensions/chrome/src/app/`

## `app/main.jsx`

React entrypoint. Mounts `App` into `page.html`, loads settings, initializes the gateway client, and starts the router.

## `app/App.jsx`

Top-level React component. Wraps the shell, theme provider, modal host, toast host, and router outlet.

## `app/appContext.js`

Defines the shared context passed to pages: settings, ronClient, navigation, theme, toast, modal, clipboard, and manifest helpers.

## `app/appEvents.js`

Small event bus for app-level events such as route changes, toast events, modal events, settings refresh, and identity refresh.

## `app/appState.js`

Central state reducer/store for the full-tab app. It should avoid hidden globals and keep route, identity, settings, wallet display, and UI mode explicit.

## `app/settings.js`

Loads, validates, updates, and watches extension settings from `storage.js`.

## `app/routeRegistry.js`

Explicit registry mapping route kinds to page modules. This enforces “one route = one page owner.”

## `app/router.js`

Parses crab URLs, browser hash state, and internal navigation events. It unmounts the previous page and mounts exactly one page.

---

# `extensions/chrome/src/app/shell/`

## `Shell.jsx`

Main visual frame for CrabLink: header, address/navigation area, content outlet, footer/dev surfaces, modal/toast mounts.

## `TopBar.jsx`

Top browser bar containing brand, gateway status, passport/account display, theme toggle, and high-level controls.

## `AddressBar.jsx`

CrabLink address input. Handles `crab://`, b3, built-in routes, and internal navigation without relying on Chrome’s native URL bar.

## `BrowserNav.jsx`

Back, forward, home, refresh, and route navigation controls.

## `PassportChip.jsx`

Displays current passport identity, username if confirmed, and profile access. It must not fake profile truth.

## `BalanceChip.jsx`

Displays wallet balance returned by backend. It should clearly handle loading, unavailable, and dev fallback states.

## `CreatorChip.jsx`

Displays site/asset creator identity when backend provides it. Eventually supports reputation/moderation summary.

## `HeaderAdSlot.jsx`

Shared header ad block. During development it visibly says “Ad Space”; later it resolves protocol-native ad campaign manifests.

## `ToastHost.jsx`

Global toast notification host for success/error/status messages.

## `ModalHost.jsx`

Global modal host for manifest drawers, confirmation prompts, proof views, and paid-action confirmations.

## `Shell.css`

Shell-specific layout styling: full-window frame, top bar, address bar, ad slot placement, and responsive layout.

---

# `extensions/chrome/src/shared/api/`

## `gatewayClient.js`

Main gateway API wrapper for health, readiness, crab resolve, b3 fetch, and generic request handling.

## `identityClient.js`

Identity/profile/passport API wrapper. It must only call gateway-exposed identity routes.

## `walletClient.js`

Wallet display and explicit hold helpers routed through gateway/wallet endpoints. No silent spending and no local balance truth.

## `assetClient.js`

Asset preparation, upload, resolve, and hydration helpers for image and future asset types.

## `siteClient.js`

Site prepare/create/open/resolve helpers. This preserves the proven site flow behind one API surface.

---

# `extensions/chrome/src/shared/components/`

## `ActionBar.jsx`

Reusable row of page actions: preview, save draft, prepare, publish, copy JSON, open manifest, etc.

## `Badge.jsx`

Small status badge component for route kind, feature gate, readiness, policy status, and truth state.

## `Button.jsx`

Standard CrabLink button component with consistent disabled/loading/danger/primary states.

## `Card.jsx`

Standard content card with consistent spacing, border, background, and theme tokens.

## `CopyButton.jsx`

Copies text to clipboard and shows success/failure feedback.

## `EmptyState.jsx`

Clean empty/loading placeholder for pages without data yet.

## `ErrorPanel.jsx`

User-safe error display for gateway errors, policy denials, validation failures, and network problems.

## `Field.jsx`

Reusable labeled field wrapper for forms.

## `FilePicker.jsx`

Reusable file picker with filename, MIME type, size, and validation display.

## `JsonPreview.jsx`

Expandable JSON preview. Developer view should use this; builder view should not be dominated by raw JSON.

## `LoadingState.jsx`

Consistent spinner/skeleton/loading copy.

## `Modal.jsx`

Reusable modal shell used by `ModalHost`.

## `PageHeader.jsx`

Standard page title, subtitle, route badge, and quick action area.

## `SegmentedControl.jsx`

Builder/Developer toggle, view mode toggle, or sub-tab selector.

## `StatChip.jsx`

Small metric/status chip for balance, price, reputation, moderation, file size, etc.

## `TextArea.jsx`

Standard multi-line input.

## `TextInput.jsx`

Standard text input.

## `Toggle.jsx`

Boolean toggle component for theme, dev mode, feature gates, and view modes.

## `TruthBoundary.jsx`

Reusable warning/info box that explains what is real backend truth, what is local draft state, and what is future/stub-only.

---

# `extensions/chrome/src/shared/embed/`

## `embedRegistry.js`

Maps safe declarative tags like `<crab-image>` to trusted renderers. This prevents each site renderer from inventing embed behavior.

## `crabImageEmbed.jsx`

Renderer for proven `<crab-image src="crab://<hash>.image">` embed primitive.

## `crabVideoEmbed.jsx`

Future renderer placeholder for `<crab-video>`. It should remain feature-gated until backend media routes exist.

## `crabAudioEmbed.jsx`

Future renderer placeholder for `<crab-audio>` / music playback references.

## `crabArticleEmbed.jsx`

Future renderer placeholder for article embeds.

## `crabPostEmbed.jsx`

Future renderer placeholder for post embeds.

## `crabCommentEmbed.jsx`

Future renderer placeholder for comment embeds.

## `safeHtml.js`

Sanitization and safe HTML rules for site rendering. This should explicitly prevent arbitrary script execution.

## `sandboxFrame.js`

Creates sandboxed render surfaces for untrusted site content. The CrabLink shell stays trusted; crab content stays isolated.

---

# `extensions/chrome/src/shared/manifest/`

## `uniformManifest.js`

Core builder for uniform manifest objects across all asset types.

## `manifestDrafts.js`

Creates local draft manifests for image, music, lyrics, article, post, comment, video, stream, podcast, ad, algo, code, and game.

## `manifestForm.jsx`

Shared manifest form UI. Pages pass type-specific sections instead of duplicating whole manifest builders.

## `manifestSections.jsx`

Reusable form sections for ownership, metadata, linked assets, rights, access, economics, provenance, receipts, and truth boundary.

## `manifestPreview.jsx`

Builder/developer preview of the manifest draft.

## `renditionGroups.js`

Helpers for media rendition groups: canonical/original pointer, alternates, siblings, and cross-linking.

## `linkedAssets.js`

Helpers for cover image, thumbnail, poster, lyrics, dub, captions, trailer, creative image, and related asset references.

## `versionHistory.js`

Helpers for manifest version/history entries.

## `rightsPolicy.js`

Helpers for rights/licensing/DRM/paywall fields.

## `accessPolicy.js`

Helpers for free, paid, subscriber, owner-only, or gated access policy draft fields.

## `economicsPolicy.js`

Helpers for ROC pricing, payout splits, ad splits, and creator/provider/treasury basis points. Display only until backend supports the route.

## `provenance.js`

Helpers for source, ownership proof, import mode, original author, and verification status.

---

# `extensions/chrome/src/shared/theme/`

## `themeStore.js`

Persists and reads selected theme: light, dark, or system.

## `ThemeProvider.jsx`

Provides theme state and applies theme classes/tokens to the app.

## `themeTokens.css`

Global semantic CSS variables: background, surface, card, text, muted, border, accent, warning, danger, success, ad colors.

## `light.css`

Light theme token values. Light should be default.

## `dark.css`

Dark theme token values.

---

# `extensions/chrome/src/shared/utils/`

## `crabUrl.js`

Frontend route parsing helpers for built-ins, typed asset URLs, named sites, and username/profile pointers.

## `b3.js`

Validation helpers for `b3:<64 lowercase hex>` and raw 64-hex hashes.

## `clipboard.js`

Clipboard write helpers with graceful failure handling.

## `dom.js`

Tiny DOM helpers for code that still needs direct DOM access. React pages should rarely need this.

## `events.js`

Small helpers for safe event binding and cleanup.

## `format.js`

Formatting helpers for bytes, ROC minor units, dates, durations, labels, and route names.

## `nonce.js`

Nonce/idempotency helpers for explicit paid operations.

## `validation.js`

Shared validation for usernames, site names, crab URLs, asset kinds, file MIME types, and draft fields.

## `viewMode.js`

Builder/Developer view helpers.

---

# `extensions/chrome/src/shared/styles/`

## `base.css`

Global reset, typography, body sizing, and base theme behavior.

## `layout.css`

Reusable layout primitives: page grid, columns, panels, full-width content, responsive rules.

## `forms.css`

Shared form field, label, input, help text, and validation styling.

## `cards.css`

Shared card, panel, stat chip, and badge styling.

## `modals.css`

Shared modal/drawer styling.

## `developer.css`

Developer view styling for JSON, route contracts, diagnostics, and proof panels.

---

# Pages

## `pages/home/HomePage.jsx`

Default home/start page for the full-tab CrabLink browser. Shows quick navigation, recent routes, gateway status, and creator actions.

## `pages/home/HomeQuickActions.jsx`

Quick action cards for creating site/image/profile/music/etc. Keeps `HomePage` smaller.

## `pages/home/home.css`

Home page layout and card styling.

---

## `pages/site/SitePage.jsx`

Owner page for `crab://site` and named site flows. It decides whether the user is creating a site, rendering a site, or viewing site proof.

## `pages/site/SiteCreate.jsx`

Site creation form and prepare/create flow. This must preserve the proven paid/site creation behavior.

## `pages/site/SiteRender.jsx`

Renders named site content in a safe sandboxed area and resolves supported crab embeds.

## `pages/site/SiteManifestDrawer.jsx`

Modal/drawer for site manifest proof. It replaces the old behavior where manifest content could append awkwardly below the page.

## `pages/site/SiteCreatorProof.jsx`

Creator identity/proof component: site creator, username, future reputation/moderation summary.

## `pages/site/SiteRootUpload.jsx`

Root HTML upload flow and guard against using image CIDs as site root CIDs.

## `pages/site/site.css`

Site-specific layout, sandbox frame sizing, creator bar, and manifest drawer styling.

---

## `pages/image/ImagePage.jsx`

Owner page for `crab://image` and typed image asset views. It coordinates create, preview, manifest, and hydrated asset display.

## `pages/image/ImageCreate.jsx`

Image publish flow: prepare, explicit hold, upload, receipt display, and resulting crab URL.

## `pages/image/ImagePreview.jsx`

Safe image preview from selected local file or resolved gateway bytes.

## `pages/image/ImageRenditions.jsx`

UI for future original/desktop/mobile/thumbnail rendition relationships.

## `pages/image/ImageManifest.jsx`

Image-specific manifest sections: dimensions, format, role, rendition group, cover/thumbnail relationships.

## `pages/image/image.css`

Image page layout and preview styling.

---

## `pages/profile/ProfilePage.jsx`

Owner page for `crab://profile` and future `crab://@username` views.

## `pages/profile/ProfileHome.jsx`

Read-only public profile view with username, display name, avatar, reputation/mod placeholders, and asset/site summaries when backend provides them.

## `pages/profile/ProfileEditor.jsx`

Local profile editing UI and future backend-confirmed profile update flow.

## `pages/profile/ProfileAvatar.jsx`

Avatar picker/preview using canonical `.image` asset references.

## `pages/profile/ProfileGateway.jsx`

Profile gateway integration: claim/read/refresh helpers exposed to the page.

## `pages/profile/ProfileAssets.jsx`

Public asset catalogue/listing surface for future profile manifests.

## `pages/profile/AltVault.jsx`

Local alternate passport vault UI. It must not publish main↔alt linkage.

## `pages/profile/profile.css`

Profile layout, avatar, header, stats, and editor styling.

---

## `pages/music/MusicPage.jsx`

Owner page for `crab://music`. It coordinates draft metadata, linked cover image, lyrics reference, rights, and future upload/publish flow.

## `pages/music/MusicDraft.jsx`

Music metadata form: title, artist, album, duration, cover image, tags, and linked lyrics.

## `pages/music/MusicRights.jsx`

Music rights/licensing section. This absorbs the old patch-style music rights script into a page-owned component.

## `pages/music/MusicLinkedAssets.jsx`

Linked assets for cover image, lyrics, stems, preview clips, and future renditions.

## `pages/music/music.css`

Music page styling.

---

## `pages/lyrics/LyricsPage.jsx`

Owner page for `crab://lyrics`.

## `pages/lyrics/LyricsDraft.jsx`

Lyrics draft form. It should treat lyrics as a separate b3-backed asset linked from music/song manifests.

## `pages/lyrics/lyrics.css`

Lyrics page styling.

---

## `pages/article/ArticlePage.jsx`

Owner page for `crab://article`.

## `pages/article/ArticleDraft.jsx`

Article draft form: title, body, hero image reference, tags, author, rights, and manifest preview.

## `pages/article/article.css`

Article page styling.

---

## `pages/post/PostPage.jsx`

Owner page for `crab://post`.

## `pages/post/PostDraft.jsx`

Post draft form for shorter social/text assets.

## `pages/post/post.css`

Post page styling.

---

## `pages/comment/CommentPage.jsx`

Owner page for `crab://comment`.

## `pages/comment/CommentDraft.jsx`

Comment draft form with parent reference, thread/site context, and moderation truth boundary.

## `pages/comment/comment.css`

Comment page styling.

---

## `pages/video/VideoPage.jsx`

Owner page for `crab://video`.

## `pages/video/VideoDraft.jsx`

Video metadata and future upload/range-plan draft UI.

## `pages/video/VideoRenditions.jsx`

Video rendition set UI: original, desktop, mobile, low-bandwidth, audio-only, poster, captions/dubs.

## `pages/video/video.css`

Video page styling.

---

## `pages/stream/StreamPage.jsx`

Owner page for `crab://stream`.

## `pages/stream/StreamDraft.jsx`

Live stream setup draft: title, category, schedule, access policy, chat/mod policy, and future stream endpoints.

## `pages/stream/StreamPodcastMode.jsx`

Feature-gated stream + podcast companion mode UI. This absorbs the old stream/podcast patch into owned route logic.

## `pages/stream/stream.css`

Stream page styling.

---

## `pages/podcast/PodcastPage.jsx`

Owner page for `crab://podcast`.

## `pages/podcast/PodcastDraft.jsx`

Podcast draft form supporting audio upload, live-stream-derived episode metadata, cover image, rights, and access policy.

## `pages/podcast/podcast.css`

Podcast page styling.

---

## `pages/ad/AdPage.jsx`

Owner page for `crab://ad`.

## `pages/ad/AdCampaignDraft.jsx`

Ad campaign draft UI: campaign name, creative, budget, placement policy, payout split, and feature-gated truth boundary.

## `pages/ad/AdCreativePreview.jsx`

Safe preview for ad creative. It should not allow third-party scripts or invasive tracking.

## `pages/ad/ad.css`

Ad page styling and header ad preview styles.

---

## `pages/algo/AlgoPage.jsx`

Owner page for `crab://algo`.

## `pages/algo/AlgoDraft.jsx`

Algorithm manifest draft: purpose, input/output contract, transparency notes, feature gate, and linked code/facet if applicable.

## `pages/algo/AlgoTransparency.jsx`

Explains how an algorithm is inspected, versioned, and governed. This keeps algorithm UX trust-focused.

## `pages/algo/algo.css`

Algorithm page styling.

---

## `pages/code/CodePage.jsx`

Owner page for `crab://code`.

## `pages/code/CodeDraft.jsx`

Code primitive draft UI. It must clearly state that crab code is not arbitrary executable code.

## `pages/code/CodeFacet.jsx`

Facet contract UI: permissions, runtime, routes/actions, limits, required capabilities, and deny-by-default policy.

## `pages/code/FacetContractPreview.jsx`

Preview of the future `facet.toml` contract.

## `pages/code/code.css`

Code/facet page styling.

---

## `pages/game/GamePage.jsx`

Owner page for `crab://game`.

## `pages/game/GameDraft.jsx`

Game manifest draft: title, runtime, asset bundles, save-data policy, multiplayer/session policy, access policy, and payout policy.

## `pages/game/GameAssets.jsx`

Linked game assets: cover image, bundles, screenshots, audio, maps, and future runtime resources.

## `pages/game/game.css`

Game page styling.

---

## `pages/asset/AssetPage.jsx`

Generic typed asset page owner for direct `crab://<hash>.<kind>` views when there is not a more specific page route.

## `pages/asset/AssetResolver.jsx`

Resolves typed crab asset URLs through the gateway.

## `pages/asset/AssetHydratedView.jsx`

Renders hydrated asset page responses safely, including manifest, ownership, payout, and preview sections.

## `pages/asset/asset.css`

Generic asset page styling.

---

## `pages/notFound/NotFoundPage.jsx`

Shown when a route is unknown, unsupported, or malformed.

## `pages/notFound/notFound.css`

Not-found page styling.

---

## `pages/problem/ProblemPage.jsx`

Structured problem/error page for gateway policy denial, not found, validation failure, upstream unavailable, and feature-gated routes.

## `pages/problem/problem.css`

Problem page styling.

---

# `extensions/chrome/src/legacy/`

## `legacy/README.md`

Explains which old `page-*` files are temporarily retained, which new page owns each old behavior, and the deletion plan.

## `legacy/page-legacy-bridge.js`

Temporary compatibility bridge while migrating one page at a time. It should be deleted after site/image/profile are fully moved.

---

# `extensions/chrome/test/`

## `manual-checklist.md`

Manual QA checklist for Chrome loading, route navigation, paid image flow, site create/open, profile UX, theme toggle, ad slot, and sandbox checks.

## `fixtures/asset-page.sample.json`

Chrome-local fixture for asset page rendering tests.

## `fixtures/problem.not-found.json`

Chrome-local fixture for not-found behavior.

## `fixtures/problem.policy-denied.json`

Chrome-local fixture for policy-denied behavior.

## `fixtures/site-page.sample.json`

Chrome-local fixture for site page rendering tests.

---

# `scripts/`

## `scripts/check-chrome.sh`

Static extension check script. It should eventually check every JS/JSX file, manifest shape, forbidden direct-service URLs, and required invariant tokens.

## `scripts/green-gate-local.sh`

Top-level local validation runner. It should run static checks, packaging, optional bootstrap, known-good raw preview, paid image upload, and site create/open gates.

## `scripts/make_codebundle.sh`

Regenerates `CODEBUNDLE_CHROME_EXTENSION.md` for review and AI-assisted refactor sessions.

## `scripts/package-chrome.sh`

Packages the Chrome extension into a distributable zip.

## `scripts/smoke-first-run-profile.sh`

Smoke test for first-run passport/profile/username UX once backend support is available.

## `scripts/smoke-local-gateway.sh`

Gateway smoke script for health, resolve, known-good raw asset load, and optional paid operations.

## `scripts/smoke-profile-gateway.sh`

Profile/identity smoke script for backend-confirmed username/profile reads.

## `scripts/smoke-site-create-local.sh`

Site prepare/create/open smoke script. This must stay green while migrating `crab://site`.

---

# Files to absorb/delete during migration

These current patch-style files should not survive as independent long-term modules:

```text
extensions/chrome/src/page-creator-route-guard.js
extensions/chrome/src/page-lifecycle-settler.js
extensions/chrome/src/page-next-level-panels.js
extensions/chrome/src/page-music-rights.js
extensions/chrome/src/page-stream-podcast-mode.js
extensions/chrome/src/page-social-stubs.js
```

Their logic should move into route-owned pages or shared components:

```text
page-creator-route-guard.js      → app/router.js + routeRegistry.js
page-lifecycle-settler.js        → React mount/unmount lifecycle
page-next-level-panels.js        → shared/components + page-owned sections
page-music-rights.js             → pages/music/MusicRights.jsx
page-stream-podcast-mode.js      → pages/stream/StreamPodcastMode.jsx
page-social-stubs.js             → pages/post, pages/comment, pages/article, pages/ad, pages/algo, pages/code, pages/game
```

The refactor notes explicitly call out these current patch modules and the goal of eliminating DOM rescue scripts, visibility patching, focus hacks, duplicate Builder/Developer toggles, and MutationObserver-based ownership. 

---

# Migration order I would use

```text
Phase 0 — Freeze current working prototype.
Phase 1 — Add app/router/shared folders and keep old flows untouched.
Phase 2 — Move local-only stubs: lyrics, post, comment, ad, algo, code, game.
Phase 3 — Move creator drafts: music, article, video, stream, podcast.
Phase 4 — Move profile.
Phase 5 — Move image, preserving paid image upload.
Phase 6 — Move site, preserving site create/open/render.
Phase 7 — Delete legacy patch/rescue files.
Phase 8 — Tighten checks and smoke tests.
```

That sequence matches the refactor notes: stub pages first because they do not mutate backend state; site/image later because they touch the proven backend flows. 
