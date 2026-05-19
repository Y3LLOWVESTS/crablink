
````markdown id="1md3ch"
---
title: CRAB_URL_AND_DEEP_LINK_IDB
version: 0.1.0
status: draft
last-updated: 2026-05-17
audience: contributors, app engineers, RustyOnions service owners, security reviewers, ops, auditors
repo-target: crablink
primary-app-target: apps/crablink-tauri
related-blueprints:
  - CRABLINK_TAURI_IDB.MD
  - SECURITY_NOTES_CRABLINK_TAURI.MD
  - TAURI_MIGRATION_IDB.MD
  - RUN_STACK_AND_MODES_IDB.MD
  - TAURI_COMMAND_BRIDGE_IDB.MD
  - STORAGE_AND_SETTINGS_IDB.MD
  - PAID_ACTIONS_AND_RECEIPTS_IDB.MD
  - OAP_CLIENT_IDB.MD
  - PASSPORT_WALLET_VAULT_IDB.MD
  - OFFLINE_CACHE_IDB.MD
  - MEDIA_TAURI_IDB.MD
  - FACET_SANDBOX_IDB.MD
---

# CRAB_URL_AND_DEEP_LINK_IDB

RO:WHAT — Defines CrabLink’s canonical `crab://` URL grammar, parser behavior, route classification, and native Tauri deep-link safety model.

RO:WHY — Tauri turns `crab://` from an in-app address bar string into a native OS entry point. That makes URL parsing, normalization, route policy, paid-gate preservation, and unsafe-input rejection part of the security boundary.

RO:INTERACTS — React route registry, TypeScript URL adapter, Tauri deep-link adapter, Tauri command bridge, gateway client, future OAP adapter, paid gates, receipt display cache, local catalog, offline cache, svc-gateway, omnigate, svc-index, svc-storage, svc-passport, svc-wallet, ron-ledger, ron-naming, ron-proto, ron-policy.

RO:INVARIANTS — `b3:<64 lowercase hex>` is canonical internal content ID. `crab://<64 lowercase hex>.<kind>` is canonical public typed asset URL. `crab://<site_name>` is human pointer. `crab://@username` is public profile pointer. Deep links are navigation input only, not spend authority, file authority, execution authority, or vault authority. Paid gates must not be bypassed. No arbitrary code execution.

RO:METRICS — URL parse rejections, route classifications, deep-link opens, deep-link rejections, unsafe scheme rejections, malformed b3 rejections, paid-gate deep-link redirects, gateway/OAP resolution source, cache hit/miss/source, and route problem classes.

RO:CONFIG — Deep-link enablement, allowed schemes, allowed asset kinds, route source preference, gateway fallback, OAP enablement, offline cache enablement, dev fixture enablement, and diagnostics visibility.

RO:SECURITY — Native `crab://` input is untrusted until parsed and classified. Reject unsafe schemes, path traversal, local file reads, command injection, secret-bearing URLs, hidden spend attempts, arbitrary executable facets, and public main→alt leakage.

RO:TEST — Parser unit tests, property tests, malformed URL tests, deep-link tests, paid-gate preservation tests, unsafe scheme tests, b3 canonicalization tests, route classification tests, gateway/OAP source tests, and native OS deep-link smoke tests.

---

## 0. Status

This blueprint defines the URL and deep-link contract for CrabLink Tauri.

It answers:

```text
What is a valid crab:// URL?
What is a valid b3 content ID?
What routes are built-in?
How do typed asset URLs work?
How do named site URLs work?
How do profile URLs work?
What happens when the OS opens crab://...?
What must be rejected?
How do paid gates remain intact?
How do we avoid turning deep links into native authority?
````

The central rule:

```text id="am97me"
A crab:// URL is navigation input.
It is not spend authority.
It is not filesystem authority.
It is not execution authority.
It is not wallet authority.
It is not vault authority.
```

---

## 1. Invariants (MUST)

### [I-1] Canonical internal content ID

Canonical internal content IDs use:

```text id="l3bi71"
b3:<64 lowercase hex>
```

Example:

```text id="z4qz90"
b3:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

Rules:

```text id="np2rnr"
- Prefix is exactly b3:
- Digest is exactly 64 lowercase hex characters.
- Uppercase is noncanonical.
- Truncated hashes are not canonical.
- Names are not content truth.
- Storage stores bytes by content ID.
- Full digest verification is required before serving cached bytes.
```

---

### [I-2] Canonical public typed asset URL

Canonical public typed asset URLs use:

```text id="dlohqb"
crab://<64 lowercase hex>.<asset_kind>
```

Examples:

```text id="zdehji"
crab://0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.image
crab://0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.post
crab://0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.comment
crab://0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.article
crab://0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.video
crab://0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.music
```

Rules:

```text id="izwca3"
- The hash portion is lowercase 64 hex.
- The kind suffix is lowercase and allowlisted.
- The dot before kind is required.
- The old public form crab://b3/<hash>.<kind> must not be reintroduced for new UX.
- Internally, typed asset URLs map to b3:<hash> plus asset kind.
```

---

### [I-3] Named site URLs are human pointers

Named site URLs use:

```text id="1sse7x"
crab://<site_name>
```

Examples:

```text id="mfry7u"
crab://thedustyonion6
crab://ron7
crab://myforum
```

Rules:

```text id="vp9pe8"
- Site names are human pointers.
- Site names are not content truth.
- Site resolution must go through gateway/OAP/index/naming path.
- Site manifests may point to b3-backed roots and references.
- Site roots must not be confused with independent asset CIDs.
```

---

### [I-4] Profile URLs use @username pointer form

Canonical public profile URL form:

```text id="qgnhpr"
crab://@username
```

Examples:

```text id="nx6ab7"
crab://@skinnycrabby
crab://@creatorname
```

Rules:

```text id="2ki5fq"
- @username is a public identity pointer.
- Profile resolution must not expose private keys.
- Profile resolution must not expose private alt mappings.
- Public profile CID may be null until backend support exists.
- Null means not published or unavailable; do not fake a profile manifest CID.
```

---

### [I-5] Built-in CrabLink pages are reserved routes

Built-in pages are product routes, not remote site names.

Reserved built-ins:

```text id="zkjngl"
crab://home
crab://library
crab://site
crab://image
crab://profile
crab://text
crab://music
crab://lyrics
crab://article
crab://post
crab://comment
crab://video
crab://stream
crab://podcast
crab://ad
crab://algo
crab://code
crab://game
crab://receipts
crab://quickchain
```

Rules:

```text id="rfb9p4"
- Built-ins resolve locally in the CrabLink app shell.
- Built-ins may call gateway routes for data.
- Built-ins must not claim backend support when only stubbed.
- Built-ins must not fake b3 CIDs, receipts, profile truth, wallet truth, or moderation truth.
```

---

### [I-6] Deep links are untrusted until parsed

Native OS deep-link input is untrusted.

Every incoming deep link must pass:

```text id="kps7rj"
raw input
→ scheme check
→ length cap
→ parser
→ normalization
→ route classification
→ policy checks
→ paid/auth gates if needed
→ navigation/render
```

No raw deep-link string should directly trigger:

```text id="aozrx0"
file read
wallet action
sidecar action
OAP frame construction
vault unlock
code execution
cache write
paid unlock
```

---

### [I-7] Only crab:// is handled by the CrabLink deep-link path

The native deep-link handler must accept:

```text id="mxzqdt"
crab://...
```

It must reject:

```text id="b6g9wk"
file://
http:// as a deep-link command
https:// as a deep-link command
javascript:
data:
blob:
chrome:
chrome-extension:
tauri:
shell:
cmd:
powershell:
ssh:
ftp:
about:
```

HTTP/HTTPS may be entered or configured elsewhere as gateway endpoints, but must not be treated as native `crab://` navigation commands.

---

### [I-8] Deep links never bypass paid gates

Opening a deep link to paid content must follow the same paid flow as typing the URL into the app.

Required flow:

```text id="kvtdag"
deep link opens
→ URL parsed/classified
→ route loads
→ if paid, quote/access check
→ explicit user confirmation if spend required
→ backend wallet path
→ receipt/access proof
→ unlock after proof
```

Forbidden:

```text id="c46q04"
crab://<paid-asset> automatically spends ROC
crab://<paid-asset> unlocks because a cached route exists
crab://<site> performs a paid site_visit without explicit confirmation
```

---

### [I-9] Deep links never execute code

No `crab://` URL may directly execute:

```text id="yypqxv"
JavaScript
WASM
native command
shell command
plugin
facet
game runtime
algo runtime
code asset
```

Facet/code/game execution requires:

```text id="144e1y"
FACET_SANDBOX_IDB.MD
policy allowlist
sandbox permissions
resource limits
explicit user intent
```

Default behavior is inert rendering or safe placeholder.

---

### [I-10] Deep links never read local files

A `crab://` URL must not grant filesystem access.

Forbidden patterns:

```text id="7cu2ci"
crab://../../etc/passwd
crab://file/...
crab://localhost/path/to/file
crab://<hash>.image?file=/secret
crab://site?root=file:///...
```

File selection, imports, and media selection must go through platform file picker adapters and command policies, not deep-link URLs.

---

### [I-11] Deep links never carry secrets

Deep links must not be used to pass:

```text id="q4h5c0"
private keys
seed phrases
bearer tokens
macaroons
capability tokens
spend authority
vault unlock codes
private main→alt mappings
wallet signing material
sidecar auth tokens
```

If a deep link contains suspicious secret-like query params, it should be rejected or sanitized.

---

### [I-12] Route classification must be deterministic

Every parsed URL must classify into one route kind:

```text id="zcbt7r"
builtin
typed_asset
named_site
profile
unsupported
invalid
unsafe
```

The same input should classify the same way in:

```text id="e0n73i"
React route registry
TypeScript parser
Tauri Rust parser
deep-link handler
tests
```

When multiple layers exist, the shared test vector set must keep them aligned.

---

### [I-13] Parser behavior must be strict by default

Strict parser defaults:

```text id="4t5tt4"
- Trim surrounding whitespace.
- Reject embedded whitespace in URLs.
- Reject control characters.
- Reject null bytes.
- Reject unsafe schemes.
- Reject oversized URLs.
- Reject malformed percent encoding.
- Reject path traversal.
- Reject unknown typed asset kinds unless explicitly allowed as future placeholder.
```

Do not auto-correct dangerous input.

---

### [I-14] Unknown asset kinds are placeholders, not backend truth

If a future kind is recognized by UI but not backend-wired, it may render a truthful placeholder.

Example:

```text id="hdwhcl"
crab://<hash>.stream
```

may show:

```text id="g2i0cy"
Stream asset route recognized.
Backend support not wired yet.
No content unlocked.
No receipt created.
```

It must not fake:

```text id="nq5rry"
manifest
receipt
price
ownership
provider status
media bytes
```

---

### [I-15] Query parameters are restricted

Initial `crab://` URLs should avoid query-driven authority.

Allowed safe future query params may include display-only hints:

```text id="7c7gek"
view
tab
section
debug=false
```

Forbidden query params:

```text id="ham6lj"
token
bearer
macaroon
private_key
seed
spend
amount
auto_pay
unlock
file
path
cmd
exec
shell
sidecar
vault
```

If any forbidden query param appears, reject or strip with a warning, depending on route policy.

---

### [I-16] Fragments are display hints only

URL fragments may be used for in-page navigation:

```text id="ujr32n"
crab://site#about
crab://<hash>.article#comments
```

Fragments must not trigger:

```text id="22h3y0"
spend
unlock
command execution
file access
vault access
sidecar start
```

---

### [I-17] Gateway mode and OAP mode must classify URLs the same way

Whether resolved through gateway or future OAP, classification remains the same.

```text id="pemksh"
URL parser/classifier
→ source selection
→ gateway or OAP resolver
```

Source selection must not change what the URL means.

---

### [I-18] Offline cache may serve only b3-verified objects

If a typed asset URL maps to cache:

```text id="mjz1aa"
crab://<hash>.image
→ internal b3:<hash>
→ read cached bytes
→ compute BLAKE3
→ compare hash
→ render only if match
```

Cache metadata alone is never enough.

---

### [I-19] Public main→alt linkage is forbidden by URL design

No URL form should reveal private identity mappings by default.

Forbidden public forms until explicitly designed:

```text id="58dhxi"
crab://@main/alt/<alt>
crab://@username?alt_private_id=...
crab://passport/main-alt-map/...
```

Alt passport routes may exist later, but privacy rules require `PASSPORT_WALLET_VAULT_IDB.MD`.

---

### [I-20] URL parsing must not depend on network availability

Parsing/classification is local and deterministic.

Resolution may need gateway/OAP/cache.

```text id="tktly0"
parse/classify: local
resolve/hydrate: gateway/OAP/cache
pay/unlock: backend proof
```

---

## 2. Design Principles (SHOULD)

### [P-1] One URL parser contract across all targets

The Chrome proof client, Tauri app, tests, and future mobile builds should use the same grammar and test vectors.

Preferred:

```text id="50zn89"
shared parser contract
shared fixtures
TypeScript implementation for UI
Rust implementation for Tauri/deep links
cross-language test vectors
```

---

### [P-2] Make `crab://` feel like browser navigation, not a command shell

Users should think:

```text id="ea2bnz"
I am opening a RON address.
```

not:

```text id="0nyerc"
I am executing a native command.
```

The implementation should enforce that distinction.

---

### [P-3] Prefer explicit route kinds over stringly typed behavior

Good:

```ts id="21qzbl"
type CrabRouteKind =
  | "builtin"
  | "typed_asset"
  | "named_site"
  | "profile"
  | "unsupported"
  | "invalid"
  | "unsafe";
```

Bad:

```ts id="58z1nw"
if (url.includes("image")) ...
```

---

### [P-4] Treat names as mutable, hashes as stable

Human names may move.

Hashes do not.

UI should make this clear:

```text id="gsb934"
crab://myforum = name pointer
b3:<hash> = content identity
crab://<hash>.image = typed public view of content identity
```

---

### [P-5] Source labels matter

Resolved pages should show safe source labels:

```text id="6wazhs"
gateway-confirmed
OAP-confirmed
offline b3-verified cache
local draft
fixture/dev only
not backend-wired
unavailable
```

---

### [P-6] Deep link open should feel like address bar navigation

When OS opens:

```text id="yzb76q"
crab://<hash>.image
```

the Tauri app should behave the same as if the user typed that URL into the CrabLink address bar.

---

### [P-7] Reject dangerous input clearly

Unsafe deep links should show:

```text id="rzvnqa"
This crab link was rejected because it is malformed or unsafe.
```

not crash, hang, or silently ignore.

---

### [P-8] Keep built-ins reserved

Built-ins like `crab://site` and `crab://image` are app pages.

If a remote user tries to register a site named `site`, app policy must resolve the conflict deterministically.

Recommended:

```text id="frq0fh"
built-ins win in app navigation
named site can be accessed later through explicit resolver path if needed
```

---

### [P-9] Keep parser independent from UI

Parser should not depend on React components, DOM, Tauri window, or gateway client.

Good layering:

```text id="22bbbu"
parser → classifier → resolver → renderer
```

---

### [P-10] Use fixtures aggressively

Every URL form should have fixtures:

```text id="x20gu4"
valid built-ins
valid typed assets
valid named sites
valid profiles
invalid hashes
unsafe schemes
query/fragment cases
path traversal cases
secret-like params
unicode/punycode cases
oversized cases
```

---

## 3. URL Grammar (HOW)

### [C-1] Canonical forms

```text id="qhgr1k"
Internal content ID:
  b3:<64 lowercase hex>

Typed asset URL:
  crab://<64 lowercase hex>.<asset_kind>

Named site URL:
  crab://<site_name>

Profile URL:
  crab://@username

Built-in URL:
  crab://<builtin>
```

---

### [C-2] Asset kind allowlist

Initial allowlist:

```text id="bb6wh7"
image
post
comment
article
text
video
music
song
audio
podcast
stream
lyrics
site-manifest
profile
```

Feature-gated/future allowlist:

```text id="00v6vq"
ad
algo
code
game
app
thread
playlist
album
film
dub
```

Rules:

```text id="1b8ixc"
- Unknown kind rejects by default.
- Future kind may route to honest placeholder if registered.
- Placeholder does not imply backend support.
- Executable kinds never execute without sandbox IDB.
```

---

### [C-3] Site name grammar

Draft site name grammar:

```text id="25fev6"
^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$
```

Properties:

```text id="sj3sid"
- lowercase only
- no spaces
- no underscores initially
- no leading hyphen
- no trailing hyphen
- max length 64
- not a reserved builtin
- not @username
- not 64 hex plus .kind
```

This can be broadened later through ron-naming policy, but the app should start strict.

---

### [C-4] Username grammar

Draft username grammar:

```text id="ing0dy"
^@[a-z0-9][a-z0-9_\\-]{1,30}[a-z0-9]$
```

Public URL form:

```text id="skqtcl"
crab://@username
```

Rules:

```text id="q4h7r2"
- Username is public pointer.
- It is not private passport secret.
- It is not wallet authority.
- It is not proof of current profile without backend confirmation.
```

---

### [C-5] Built-in route registry

Built-in registry shape:

```ts id="729f6n"
export const BUILTIN_CRAB_ROUTES = {
  home: { route: "home", auth: "none", paid: false },
  library: { route: "library", auth: "none", paid: false },
  site: { route: "site", auth: "optional", paid: false },
  image: { route: "image", auth: "optional", paid: false },
  profile: { route: "profile", auth: "optional", paid: false },
  text: { route: "text", auth: "none", paid: false },
  receipts: { route: "receipts", auth: "optional", paid: false },
  quickchain: { route: "quickchain", auth: "none", paid: false },
};
```

Future pages should register here, not through ad hoc string checks.

---

### [C-6] Route classification result

TypeScript shape:

```ts id="6nfg9i"
export type CrabRouteKind =
  | "builtin"
  | "typed_asset"
  | "named_site"
  | "profile"
  | "unsupported"
  | "invalid"
  | "unsafe";

export interface CrabRouteClassification {
  schema: "crablink.crab-route-classification.v1";
  input: string;
  normalized?: string;
  kind: CrabRouteKind;
  assetKind?: string;
  b3?: string;
  siteName?: string;
  username?: string;
  builtin?: string;
  fragment?: string;
  query?: Record<string, string>;
  reason?: string;
  requiresGateway: boolean;
  mayRequirePaidGate: boolean;
  mayUseOfflineCache: boolean;
  mayUseOap: boolean;
}
```

Rust shape:

```rust id="d9f8ca"
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CrabRouteKind {
    Builtin,
    TypedAsset,
    NamedSite,
    Profile,
    Unsupported,
    Invalid,
    Unsafe,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct CrabRouteClassification {
    pub schema: &'static str,
    pub input: String,
    pub normalized: Option<String>,
    pub kind: CrabRouteKind,
    pub asset_kind: Option<String>,
    pub b3: Option<String>,
    pub site_name: Option<String>,
    pub username: Option<String>,
    pub builtin: Option<String>,
    pub fragment: Option<String>,
    pub reason: Option<String>,
    pub requires_gateway: bool,
    pub may_require_paid_gate: bool,
    pub may_use_offline_cache: bool,
    pub may_use_oap: bool,
}
```

---

### [C-7] Normalization algorithm

Pseudo-flow:

```text id="hwezz7"
1. Receive raw input.
2. Enforce length cap.
3. Trim surrounding whitespace.
4. Reject null/control characters.
5. Reject embedded whitespace.
6. Require crab:// scheme for crab URL parser.
7. Split authority/path/query/fragment.
8. Reject unsafe query params.
9. Classify:
   a. reserved built-in
   b. @username profile
   c. <64hex>.<kind> typed asset
   d. valid site_name
   e. unsupported/invalid
10. Produce canonical normalized string.
```

---

### [C-8] Length caps

Suggested initial caps:

```text id="p5mmoh"
max full crab URL length: 2048 bytes
max site name length: 64 chars
max username length: 32 chars including @
max asset kind length: 32 chars
max fragment length: 256 bytes
max query string length: 512 bytes
```

Longer forms may exist later, but require explicit review.

---

### [C-9] Unsafe query param denylist

Reject if query key matches:

```text id="60f7qi"
token
access_token
bearer
authorization
macaroon
cap
capability
private_key
seed
seed_phrase
mnemonic
password
pin
spend
auto_pay
auto_hold
auto_capture
unlock
file
path
cmd
command
exec
shell
sidecar
vault
```

Comparison should be case-insensitive.

---

### [C-10] Parsed route to resolver mapping

| Classification | Resolver                   | Notes                        |
| -------------- | -------------------------- | ---------------------------- |
| `builtin`      | local React route          | May call gateway inside page |
| `typed_asset`  | gateway/OAP/cache resolver | b3 canonical                 |
| `named_site`   | gateway/OAP resolver       | human pointer                |
| `profile`      | gateway/profile resolver   | public pointer               |
| `unsupported`  | placeholder route          | no fake backend truth        |
| `invalid`      | problem page               | user-correctable             |
| `unsafe`       | security rejection page    | redacted diagnostics         |

---

## 4. Native Deep-Link Lifecycle (HOW)

### [D-1] Tauri deep-link flow

```text id="ktkc7e"
OS receives crab://...
→ Tauri deep-link plugin/platform event
→ Rust deep-link adapter receives raw URL
→ length cap + scheme check
→ Rust parser/classifier
→ unsafe/invalid rejected
→ safe route event emitted to frontend
→ React router navigates
→ page resolver performs gateway/OAP/cache flow
→ paid gates apply if needed
```

---

### [D-2] Deep link event payload

Rust-to-frontend safe event:

```rust id="mt7l2y"
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub struct DeepLinkOpenEvent {
    pub schema: &'static str,
    pub correlation_id: String,
    pub raw_redacted: String,
    pub classification: CrabRouteClassification,
    pub received_at_ms: u64,
}
```

Do not emit raw secret-bearing URL if rejected.

---

### [D-3] Deep link rejection payload

```rust id="prmtii"
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub struct DeepLinkRejected {
    pub schema: &'static str,
    pub correlation_id: String,
    pub reason: DeepLinkRejectReason,
    pub safe_message: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DeepLinkRejectReason {
    UnsupportedScheme,
    Malformed,
    TooLong,
    ControlCharacters,
    UnsafeQueryParam,
    PathTraversal,
    SecretLikePayload,
    UnsupportedRoute,
}
```

---

### [D-4] Frontend deep-link handling

Frontend receives a safe event and navigates:

```ts id="ibxkxe"
export function handleDeepLinkOpen(event: DeepLinkOpenEvent, router: CrabRouter) {
  const route = event.classification;

  if (route.kind === "invalid" || route.kind === "unsafe") {
    router.navigateToProblem({
      code: route.kind,
      message: route.reason || "The crab link could not be opened safely.",
    });
    return;
  }

  router.navigate(route.normalized || route.input, {
    source: "native_deep_link",
    correlationId: event.correlation_id,
  });
}
```

---

### [D-5] Deep links and paid gates

Deep links must set navigation source only:

```text id="p1oa05"
source = native_deep_link
```

They must not set:

```text id="25uc26"
user_confirmed = true
paid = true
receipt_verified = true
auto_unlock = true
```

---

## 5. Implementation Patterns (HOW)

### [C-11] Suggested files

```text id="d9hjz1"
apps/crablink-tauri/
  src/
    adapters/
      deepLinks/
        deepLinkClient.ts
        deepLinkTypes.ts
      routes/
        crabRouteTypes.ts
        crabRouteAdapter.ts

  src-tauri/
    src/
      deep_link/
        mod.rs
        parser.rs
        classify.rs
        event.rs
        reject.rs
      commands/
        deep_links.rs
      bridge/
        redaction.rs

packages/crablink-core/
  src/
    shared/
      utils/
        crabUrl.js
        b3.js
    routeRegistry/
      builtinRoutes.js
      crabRouteTypes.js
      crabRouteFixtures.js
```

---

### [C-12] TypeScript parser interface

```ts id="xg0zug"
export interface CrabUrlParser {
  parse(input: string): CrabRouteClassification;
  normalize(input: string): string;
  isSafe(input: string): boolean;
}
```

---

### [C-13] Parser test vectors

```ts id="ray60c"
export const CRAB_URL_TEST_VECTORS = [
  {
    input: "crab://home",
    kind: "builtin",
    normalized: "crab://home",
  },
  {
    input: "crab://0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.image",
    kind: "typed_asset",
    b3: "b3:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    assetKind: "image",
  },
  {
    input: "crab://thedustyonion6",
    kind: "named_site",
    siteName: "thedustyonion6",
  },
  {
    input: "crab://@skinnycrabby",
    kind: "profile",
    username: "skinnycrabby",
  },
  {
    input: "javascript:alert(1)",
    kind: "unsafe",
  },
];
```

---

### [C-14] Rust parser notes

Rust parser should avoid URL library behavior that silently treats unusual forms as acceptable.

Important cases:

```text id="yx9x8x"
crab://<hash>.image
crab://@username
crab://site
crab://thedustyonion6
```

The parser should be explicit enough that `@username` and `<hash>.<kind>` are first-class CrabLink forms, not accidental host/path behavior.

---

### [C-15] Route source options

```ts id="kqw2dw"
export type CrabRouteOpenSource =
  | "address_bar"
  | "native_deep_link"
  | "internal_nav"
  | "recent_route"
  | "local_catalog"
  | "receipt_panel"
  | "fixture"
  | "test";
```

Rules:

```text id="00g3kk"
source affects diagnostics
source does not bypass policy
source does not imply paid access
source does not imply backend truth
```

---

### [C-16] Problem page shape

Unsafe/invalid URLs should render a safe problem page.

```ts id="02s3f7"
export interface CrabRouteProblem {
  schema: "crablink.route-problem.v1";
  code:
    | "invalid_crab_url"
    | "unsafe_scheme"
    | "malformed_b3"
    | "unsupported_asset_kind"
    | "reserved_route_conflict"
    | "secret_like_deep_link"
    | "route_not_found";
  message: string;
  safeInputPreview?: string;
  correlationId?: string;
}
```

---

### [C-17] Gateway resolve mapping

Typed asset:

```text id="zx52t4"
crab://<hash>.<kind>
→ GET /crab/resolve?url=crab://<hash>.<kind>
or
→ GET /b3/<hash>.<kind>
```

Named site:

```text id="iyzxfa"
crab://<site_name>
→ GET /crab/resolve?url=crab://<site_name>
or
→ GET /sites/<site_name>
```

Profile:

```text id="uodkhz"
crab://@username
→ future GET /crab/resolve?url=crab://@username
or
→ interim gateway profile route if available
```

Built-in:

```text id="35kktt"
crab://home
→ local route
```

---

### [C-18] Offline cache mapping

Typed asset only:

```text id="kzqkoe"
crab://<hash>.<kind>
→ b3:<hash>
→ cache lookup
→ BLAKE3 verification
→ render if verified
```

Named sites may cache hydrated display snapshots later, but must not treat name cache as canonical truth.

---

### [C-19] Embed URL handling

Inside rendered site HTML, supported declarative embeds include:

```html id="tza68m"
<crab-image src="crab://<hash>.image"></crab-image>
<crab-post src="crab://<hash>.post"></crab-post>
<crab-comment src="crab://<hash>.comment"></crab-comment>
<crab-article src="crab://<hash>.article"></crab-article>
<crab-video src="crab://<hash>.video"></crab-video>
<crab-audio src="crab://<hash>.music"></crab-audio>
```

Rules:

```text id="ujdqow"
- Embed src uses same parser.
- Unsupported embeds render honest placeholders.
- Scripts/events/forms are stripped by safe renderer.
- No arbitrary JavaScript runs from site HTML.
```

---

## 6. Acceptance Gates (PROOF)

### [G-1] URL doctrine gate

```text id="yfbnsm"
[ ] CRAB_URL_AND_DEEP_LINK_IDB.MD exists.
[ ] Canonical b3 internal form is documented.
[ ] Canonical typed asset URL form is documented.
[ ] Named site URL form is documented.
[ ] Profile @username URL form is documented.
[ ] Built-in reserved routes are documented.
[ ] Old crab://b3/<hash> public form is not reintroduced.
```

---

### [G-2] Parser gate

```text id="m97iit"
[ ] TypeScript parser exists or existing parser is mapped to this contract.
[ ] Rust parser exists before native deep links are enabled.
[ ] Parser has length caps.
[ ] Parser rejects unsafe schemes.
[ ] Parser rejects control characters.
[ ] Parser rejects malformed b3 hashes.
[ ] Parser rejects forbidden query params.
[ ] Parser classifies built-in/typed_asset/named_site/profile/invalid/unsafe.
[ ] Parser fixtures exist.
```

---

### [G-3] Cross-language parity gate

```text id="fbouqh"
[ ] TypeScript and Rust parser fixtures share the same vectors.
[ ] `crab://home` classifies identically.
[ ] `crab://<hash>.image` classifies identically.
[ ] `crab://@username` classifies identically.
[ ] `crab://<site_name>` classifies identically.
[ ] Unsafe schemes reject identically enough for UI.
[ ] Malformed b3 rejects identically enough for UI.
```

---

### [G-4] Native deep-link gate

```text id="v00v9e"
[ ] Native crab:// registration is implemented or truthfully stubbed.
[ ] OS-opened crab:// URL reaches Tauri handler.
[ ] Tauri handler does not directly navigate without parser.
[ ] Tauri handler rejects unsafe input.
[ ] Tauri handler emits safe event to frontend.
[ ] Frontend routes using classification.
[ ] Invalid/unsafe links render problem page.
```

---

### [G-5] Paid-gate preservation gate

```text id="6w5x2a"
[ ] Deep link to paid asset does not auto-spend.
[ ] Deep link to paid site does not auto-spend.
[ ] Deep link cannot set user_confirmed=true.
[ ] Deep link cannot set receipt_verified=true.
[ ] Paid route still requires backend receipt/access proof.
[ ] Gateway/wallet unavailable fails closed.
```

---

### [G-6] Unsafe input gate

```text id="utzqsf"
[ ] file:// rejected.
[ ] javascript: rejected.
[ ] data: rejected.
[ ] shell/cmd/powershell forms rejected.
[ ] path traversal rejected.
[ ] secret-like query params rejected or stripped safely.
[ ] oversized URL rejected.
[ ] embedded null/control characters rejected.
```

---

### [G-7] Built-in route gate

```text id="23f4c8"
[ ] crab://home routes locally.
[ ] crab://library routes locally.
[ ] crab://site routes locally.
[ ] crab://image routes locally.
[ ] crab://profile routes locally.
[ ] crab://receipts routes locally.
[ ] crab://quickchain routes locally as readiness/display only.
[ ] Built-ins do not fake backend truth.
```

---

### [G-8] Typed asset route gate

```text id="h50w8l"
[ ] crab://<hash>.image maps to b3:<hash> and kind=image.
[ ] crab://<hash>.post maps to b3:<hash> and kind=post.
[ ] crab://<hash>.comment maps to b3:<hash> and kind=comment.
[ ] crab://<hash>.article maps to b3:<hash> and kind=article.
[ ] Unsupported kind gives honest placeholder or rejection.
[ ] Route source is labeled gateway/OAP/cache/fixture.
```

---

### [G-9] Named site route gate

```text id="n5m5zj"
[ ] crab://<site_name> classifies as named_site.
[ ] Built-in reserved names are not accidentally treated as remote sites.
[ ] Named site resolution goes through gateway/OAP.
[ ] Site route does not fake creator/profile truth.
[ ] Site route does not confuse image CID with site root.
```

---

### [G-10] Profile route gate

```text id="u1b9ax"
[ ] crab://@username classifies as profile.
[ ] Profile route does not expose private alt mapping.
[ ] Profile route labels null public_profile_cid honestly.
[ ] Profile route does not fake REP/MOD scores.
[ ] Future gateway resolver support remains compatible.
```

---

### [G-11] Offline cache gate

```text id="0dtrrp"
[ ] Typed asset cache lookup uses b3:<hash>.
[ ] Cached bytes are BLAKE3-verified before render.
[ ] Cache metadata cannot override hash truth.
[ ] Cache mismatch rejects render.
[ ] Offline named site cache is labeled as cache/snapshot.
[ ] Cache cannot unlock paid content without valid proof.
```

---

### [G-12] Embed route gate

```text id="vfhf0g"
[ ] Embed src values use the same parser.
[ ] crab-image still works.
[ ] crab-post placeholder/route is honest.
[ ] crab-comment placeholder/route is honest.
[ ] crab-article placeholder/route is honest.
[ ] crab-video/audio do not full-buffer large media through command bridge.
[ ] Unsupported embeds do not break site render.
[ ] Scripts/events/forms are not executed.
```

---

## 7. Anti-Scope (Forbidden)

Forbidden in this blueprint:

```text id="l5cvpc"
- Treating deep links as command execution.
- Treating deep links as spend confirmation.
- Treating deep links as receipt proof.
- Treating deep links as wallet authority.
- Treating deep links as vault authority.
- Treating deep links as sidecar authority.
- Treating deep links as filesystem authority.
- Auto-paying from a crab:// URL.
- Unlocking paid content from a crab:// URL alone.
- Passing tokens/macaroons/private keys through crab:// URLs.
- Reintroducing crab://b3/<hash>.<kind> as the public UX format.
- Accepting malformed b3 hashes as canonical.
- Using cache metadata as content truth.
- Running arbitrary JavaScript/WASM/native code from crab links.
- Publicly exposing main→alt mappings in URL forms.
- Calling internal services directly from URL parser.
- Making parser behavior depend on network availability.
- Letting OAP mode reinterpret URLs differently than gateway mode.
- Treating named sites as immutable content truth.
- Treating public profiles as wallet authority.
- Allowing `file://`, `javascript:`, `data:`, shell, or command schemes into the crab route path.
```

---

## 8. References

Primary references:

```text id="4t6sgd"
CRABLINK_TAURI_IDB.MD
SECURITY_NOTES_CRABLINK_TAURI.MD
TAURI_MIGRATION_IDB.MD
RUN_STACK_AND_MODES_IDB.MD
TAURI_COMMAND_BRIDGE_IDB.MD
Pasted text.txt
NOTES.MD
CODEBUNDLE_CHROME_EXTENSION.md
CODEBUNDLE_RS.md
ALLNOTES.MD
ALL_DOCS_COMBINED.MD
NEXT_LEVEL.MD
QUICKCHAIN.MD
CODECHECK.md
CODECOMMENTS.MD
```

Current URL rules preserved:

```text id="5gpp4n"
Internal content ID:
  b3:<64 lowercase hex>

Public typed asset URL:
  crab://<64 lowercase hex>.<asset_kind>

Named site URL:
  crab://<site_name>

Public profile URL:
  crab://@username
```

Current product proof preserved:

```text id="3o4u28"
named site
→ b3 root HTML
→ embedded crab:// image reference
→ independent b3 image asset
→ gateway-resolved bytes
→ sandboxed browser rendering
```

---

## 9. Reviewer Checklist

Before approving URL/deep-link work:

```text id="i82s5f"
[ ] Does this preserve canonical b3 form?
[ ] Does this preserve canonical typed asset URL form?
[ ] Does this avoid old crab://b3/<hash> public form?
[ ] Are built-ins reserved?
[ ] Are named sites human pointers only?
[ ] Are profile URLs public pointers only?
[ ] Does parser reject unsafe schemes?
[ ] Does parser reject path traversal?
[ ] Does parser reject secret-like params?
[ ] Does native deep-link handler parse before routing?
[ ] Does deep-link route preserve paid gates?
[ ] Does deep-link route avoid file reads?
[ ] Does deep-link route avoid execution?
[ ] Does deep-link route avoid sidecar/vault authority?
[ ] Are OAP/gateway/cache sources consistent?
[ ] Are invalid routes shown safely?
[ ] Are all route outcomes source-labeled?
[ ] Are parser fixtures updated?
```

---

## 10. First Implementation Batch Recommendation

### Batch D1 — Shared parser contract

Files likely to add or update:

```text id="mip0zl"
packages/crablink-core/src/shared/utils/crabUrl.js
packages/crablink-core/src/shared/utils/b3.js
packages/crablink-core/src/routeRegistry/crabRouteTypes.js
packages/crablink-core/src/routeRegistry/builtinRoutes.js
packages/crablink-core/src/routeRegistry/crabRouteFixtures.js
apps/crablink-tauri/src/adapters/deepLinks/deepLinkTypes.ts
apps/crablink-tauri/src-tauri/src/deep_link/parser.rs
apps/crablink-tauri/src-tauri/src/deep_link/classify.rs
```

Initial goal:

```text id="3krag3"
Classify crab://home, crab://<hash>.image, crab://@username, crab://<site_name>, and unsafe schemes identically enough across TypeScript and Rust.
```

---

### Batch D2 — Tauri deep-link stub

Files likely to add:

```text id="5qcbkm"
apps/crablink-tauri/src-tauri/src/deep_link/mod.rs
apps/crablink-tauri/src-tauri/src/deep_link/event.rs
apps/crablink-tauri/src-tauri/src/deep_link/reject.rs
apps/crablink-tauri/src/adapters/deepLinks/deepLinkClient.ts
```

Initial behavior:

```text id="by0gvn"
- native deep-link support may be stubbed if platform setup is not ready
- manual command can simulate incoming deep link
- malformed links reject safely
- safe links navigate through normal router
```

---

### Batch D3 — Paid gate preservation

Test cases:

```text id="x6gkct"
- deep link to paid image route does not auto-spend
- deep link to paid post route does not auto-spend
- deep link to paid article route does not auto-spend
- deep link to site requiring visit payment does not auto-spend
- user confirmation remains required
```

---

## 11. Plain-English Summary

`crab://` is the address system for the new internet layer.

That makes it powerful.

But in Tauri, `crab://` is no longer just a string in an address bar. It becomes a native OS entry point.

So the rule is:

```text id="znbuqt"
Parse first.
Classify second.
Policy third.
Resolve fourth.
Pay only with explicit confirmation.
Render only after proof.
Never execute from the URL.
```

Correct mental model:

```text id="c2ievm"
b3 hash = content truth
crab URL = human/product route
deep link = navigation request
gateway/OAP = resolver path
wallet/ledger = economic truth
cache = verified display convenience
```

Most important rule:

```text id="w2yrl8"
A crab link can open a door.
It cannot secretly spend, execute, unlock, read files, or become backend truth.
```

```
```
