/**
 * RO:WHAT — Home quick-action route cards for CrabLink React built-ins.
 * RO:WHY — App Integration; Concerns: DX; makes route smoke testing fast, visible, and honest.
 * RO:INTERACTS — app.navigate, built-in page owners, local/debug route URLs.
 * RO:INVARIANTS — navigation/copy only; no backend mutation; no fake publication; no ROC action.
 * RO:METRICS — none.
 * RO:CONFIG — built-in route list below.
 * RO:SECURITY — no paid or privileged action; copied URLs are route/debug helpers only.
 * RO:TEST — manually click every route card after build and extension reload.
 */

import { useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';

const LOCAL_PREVIEW_ORIGIN = 'http://127.0.0.1:4173';

const ROUTE_GROUPS = Object.freeze([
  {
    title: 'Proven product routes',
    eyebrow: 'Live proof routes',
    status: 'proven',
    copy:
      'These are the high-value routes now worth checking every batch. They still must stay explicit, gateway-only, and honest about backend truth.',
    routes: [
      {
        kind: 'site',
        label: 'Site',
        route: 'crab://site',
        purpose: 'site prepare, hold, root storage, create pointer, render, manifest diagnostics',
        risk: 'paid/site flow',
        proof: 'crab://ron6',
      },
      {
        kind: 'image',
        label: 'Image',
        route: 'crab://image',
        purpose: 'paid image prepare, hold, upload, receipt display, renditions',
        risk: 'paid upload flow',
        proof: 'crab://6e343cbcbcd233a72ce45b197d1c45caea862480221ef0f7e4e4360f17e1fce0.image',
      },
      {
        kind: 'profile',
        label: 'Profile',
        route: 'crab://profile',
        purpose: 'passport-linked identity draft, @username display, avatar, alts, REP/MOD truth boundary',
        risk: 'identity truth',
      },
      {
        kind: 'asset',
        label: 'Asset',
        route: sampleAssetRoute(),
        purpose: 'typed b3 asset hydration and generic asset page regression check',
        risk: 'gateway truth',
      },
    ],
  },
  {
    title: 'Text and identity primitives',
    eyebrow: 'Local draft routes',
    status: 'local',
    copy:
      'Low-risk creator surfaces. These stay local-only until backend post/comment/article/lyrics contracts exist.',
    routes: [
      {
        kind: 'lyrics',
        label: 'Lyrics',
        route: 'crab://lyrics',
        purpose: 'standalone lyrics asset, rights/versioning boundary',
        risk: 'local draft',
      },
      {
        kind: 'article',
        label: 'Article',
        route: 'crab://article',
        purpose: 'long-form article manifest, hero image, tags, access',
        risk: 'local draft',
      },
      {
        kind: 'post',
        label: 'Post',
        route: 'crab://post',
        purpose: 'short/social post asset, feed/profile/thread references',
        risk: 'local draft',
      },
      {
        kind: 'comment',
        label: 'Comment',
        route: 'crab://comment',
        purpose: 'comment asset, target/parent/moderation/site policy',
        risk: 'local draft',
      },
    ],
  },
  {
    title: 'Media creator workspaces',
    eyebrow: 'Local media drafts',
    status: 'local',
    copy:
      'Media manifests model renditions, rights, linked assets, sessions, transcripts, and future payout/access policy without upload claims.',
    routes: [
      {
        kind: 'music',
        label: 'Music',
        route: 'crab://music',
        purpose: 'music/song metadata, lyrics link, cover art, rights, payout',
        risk: 'local draft',
      },
      {
        kind: 'podcast',
        label: 'Podcast',
        route: 'crab://podcast',
        purpose: 'episode/show asset, transcript, audio upload planning',
        risk: 'local draft',
      },
      {
        kind: 'stream',
        label: 'Stream',
        route: 'crab://stream',
        purpose: 'live session draft, chat/mod/replay/podcast companion',
        risk: 'local draft',
      },
      {
        kind: 'video',
        label: 'Video',
        route: 'crab://video',
        purpose: 'video asset, poster, renditions, captions/dubs',
        risk: 'local draft',
      },
    ],
  },
  {
    title: 'Advanced protocol primitives',
    eyebrow: 'Local advanced drafts',
    status: 'local',
    copy:
      'These routes are intentionally inert. Code/game/algo require facet, sandbox, and policy contracts before execution can exist.',
    routes: [
      {
        kind: 'ad',
        label: 'Ad',
        route: 'crab://ad',
        purpose: 'protocol-native ad campaign manifest and safe header preview',
        risk: 'local draft',
      },
      {
        kind: 'algo',
        label: 'Algo',
        route: 'crab://algo',
        purpose: 'transparent feed/search/moderation/recommendation manifests',
        risk: 'no execution',
      },
      {
        kind: 'code',
        label: 'Code',
        route: 'crab://code',
        purpose: 'code primitive manifest, facet.toml, permissions, limits',
        risk: 'no execution',
      },
      {
        kind: 'game',
        label: 'Game',
        route: 'crab://game',
        purpose: 'game manifest, asset bundles, saves, multiplayer, facet policy',
        risk: 'no execution',
      },
    ],
  },
]);

export default function HomeQuickActions({ app }) {
  const [copyState, setCopyState] = useState('');
  const allRoutes = useMemo(
    () => ROUTE_GROUPS.flatMap((group) => group.routes.map((route) => route.route || `crab://${route.kind}`)),
    [],
  );

  function open(route) {
    const crabRoute = route.route || `crab://${route.kind}`;

    if (app?.navigate) {
      app.navigate(crabRoute);
    }
  }

  async function copyCrabUrl(route) {
    const crabRoute = route.route || `crab://${route.kind}`;
    await copyText(crabRoute, `Copied ${crabRoute}`);
  }

  async function copyDebugUrl(route) {
    const crabRoute = route.route || `crab://${route.kind}`;
    await copyText(buildPreviewUrl(crabRoute), `Copied ${crabRoute} debug URL`);
  }

  async function copySmokeList() {
    const lines = [
      'CrabLink React route smoke list',
      '',
      'Default path:',
      '1. cd /Users/mymac/Desktop/crablink',
      '2. npm run build',
      '3. scripts/check-react-lane.sh',
      '4. scripts/check-chrome.sh',
      '5. scripts/package-chrome.sh',
      '6. scripts/make_codebundle.sh',
      '7. Reload unpacked extension and click the React button.',
      '',
      'Optional fallback debug server:',
      'cd /Users/mymac/Desktop/crablink/dist/chrome-src',
      'python3 -m http.server 4173 --bind 127.0.0.1',
      '',
      'Routes:',
      ...allRoutes.map((route) => `${route} -> ${buildPreviewUrl(route)}`),
    ];

    await copyText(lines.join('\n'), 'Copied full route smoke list');
  }

  async function copyText(value, message) {
    try {
      await navigator.clipboard.writeText(String(value ?? ''));
      setCopyState(message);
    } catch (_error) {
      setCopyState('Clipboard unavailable in this browser context');
    }

    window.setTimeout(() => setCopyState(''), 2200);
  }

  return (
    <section className="cl-home-actions" aria-label="CrabLink route quick actions">
      <div className="cl-home-actions-head">
        <div>
          <p className="cl-eyebrow">Route quick actions</p>
          <h2>Built-in crab:// routes</h2>
          <p>
            Open each route from here and confirm one clear page owner mounts. Copy crab URLs for
            normal extension testing or debug URLs only when you need the optional local HTTP preview fallback.
          </p>
        </div>

        <div className="cl-home-actions-tools">
          <Button variant="secondary" onClick={copySmokeList}>
            Copy smoke list
          </Button>
          {copyState && <span>{copyState}</span>}
        </div>
      </div>

      <div className="cl-home-route-groups">
        {ROUTE_GROUPS.map((group) => (
          <Card
            key={group.title}
            eyebrow={group.eyebrow}
            title={group.title}
            actions={<Badge tone={group.status === 'proven' ? 'success' : 'neutral'}>{group.status}</Badge>}
          >
            <p className="cl-home-group-copy">{group.copy}</p>

            <div className="cl-home-route-list">
              {group.routes.map((route) => (
                <article key={`${group.title}-${route.kind}`} className={`cl-home-route-card is-${group.status}`}>
                  <div className="cl-home-route-card-head">
                    <div>
                      <span className="cl-home-route-kind">{route.route || `crab://${route.kind}`}</span>
                      <h3>{route.label}</h3>
                    </div>
                    <span className="cl-home-route-risk">{route.risk}</span>
                  </div>

                  <p>{route.purpose}</p>

                  {route.proof && (
                    <div className="cl-home-route-proof">
                      <span>Recent proof</span>
                      <code>{route.proof}</code>
                    </div>
                  )}

                  <div className="cl-home-route-actions">
                    <Button variant="secondary" onClick={() => open(route)}>
                      Open
                    </Button>
                    <Button variant="secondary" onClick={() => copyCrabUrl(route)}>
                      Copy crab
                    </Button>
                    <Button variant="ghost" onClick={() => copyDebugUrl(route)}>
                      Debug URL
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function buildPreviewUrl(crabRoute) {
  return `${LOCAL_PREVIEW_ORIGIN}/react.html?url=${encodeURIComponent(crabRoute)}`;
}

function sampleAssetRoute() {
  return 'crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image';
}