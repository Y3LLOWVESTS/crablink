/**
 * RO:WHAT — Home quick-action route cards for CrabLink React built-ins.
 * RO:WHY — App Integration; Concerns: DX; makes route smoke testing fast, visible, and honest.
 * RO:INTERACTS — app.navigate, built-in page owners, local HTTP preview route URLs.
 * RO:INVARIANTS — navigation/copy only; no backend mutation; no fake publication; no ROC action.
 * RO:METRICS — none.
 * RO:CONFIG — built-in route list below.
 * RO:SECURITY — no paid or privileged action; copied URLs are local preview links only.
 * RO:TEST — manually click every route card after build and local HTTP preview.
 */

import { useMemo, useState } from 'react';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';

const LOCAL_PREVIEW_ORIGIN = 'http://127.0.0.1:4173';

const ROUTE_GROUPS = Object.freeze([
  {
    title: 'Protected / late migration',
    eyebrow: 'Parity routes',
    status: 'protected',
    copy:
      'These routes touch proven product flows or identity surfaces. Keep the old lane protected until React parity is deliberate.',
    routes: [
      {
        kind: 'site',
        label: 'Site',
        purpose: 'site create/open/render, manifest drawer, crab-image embeds',
        risk: 'paid/site parity',
      },
      {
        kind: 'image',
        label: 'Image',
        purpose: 'paid image prepare, hold, upload, receipt, renditions',
        risk: 'paid upload parity',
      },
      {
        kind: 'profile',
        label: 'Profile',
        purpose: 'passport-linked identity, @username, avatar, alts',
        risk: 'identity truth',
      },
      {
        kind: 'asset',
        label: 'Asset',
        purpose: 'typed b3 asset hydration and generic asset pages',
        risk: 'gateway truth',
        route: sampleAssetRoute(),
      },
    ],
  },
  {
    title: 'Text and identity primitives',
    eyebrow: 'Local draft routes',
    status: 'local',
    copy:
      'Low-risk creator surfaces. These should remain local-only until backend post/comment/article/lyrics contracts exist.',
    routes: [
      {
        kind: 'lyrics',
        label: 'Lyrics',
        purpose: 'standalone lyrics asset, rights/versioning boundary',
        risk: 'local draft',
      },
      {
        kind: 'article',
        label: 'Article',
        purpose: 'long-form article manifest, hero image, tags, access',
        risk: 'local draft',
      },
      {
        kind: 'post',
        label: 'Post',
        purpose: 'short/social post asset, feed/profile/thread references',
        risk: 'local draft',
      },
      {
        kind: 'comment',
        label: 'Comment',
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
      'Media manifests now model renditions, rights, linked assets, sessions, transcripts, and future payout/access policy without upload claims.',
    routes: [
      {
        kind: 'music',
        label: 'Music',
        purpose: 'music/song metadata, lyrics link, cover art, rights, payout',
        risk: 'local draft',
      },
      {
        kind: 'podcast',
        label: 'Podcast',
        purpose: 'episode/show asset, transcript, audio upload planning',
        risk: 'local draft',
      },
      {
        kind: 'stream',
        label: 'Stream',
        purpose: 'live session draft, chat/mod/replay/podcast companion',
        risk: 'local draft',
      },
      {
        kind: 'video',
        label: 'Video',
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
      'These routes are intentionally inert. Code/game/algo require facet/sandbox/policy contracts before any execution can exist.',
    routes: [
      {
        kind: 'ad',
        label: 'Ad',
        purpose: 'protocol-native ad campaign manifest and safe header preview',
        risk: 'local draft',
      },
      {
        kind: 'algo',
        label: 'Algo',
        purpose: 'transparent feed/search/moderation/recommendation manifests',
        risk: 'no execution',
      },
      {
        kind: 'code',
        label: 'Code',
        purpose: 'code primitive manifest, facet.toml, permissions, limits',
        risk: 'no execution',
      },
      {
        kind: 'game',
        label: 'Game',
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

  async function copyPreviewUrl(route) {
    const crabRoute = route.route || `crab://${route.kind}`;
    const previewUrl = buildPreviewUrl(crabRoute);

    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopyState(`Copied ${crabRoute} preview URL`);
    } catch (_error) {
      setCopyState('Clipboard unavailable in this browser context');
    }

    window.setTimeout(() => setCopyState(''), 2200);
  }

  async function copySmokeList() {
    const lines = [
      'CrabLink React route smoke list',
      '',
      'Start local preview server:',
      'cd /Users/mymac/Desktop/crablink/dist/chrome-src',
      'python3 -m http.server 4173 --bind 127.0.0.1',
      '',
      'Open these routes:',
      ...allRoutes.map((route) => `${route} -> ${buildPreviewUrl(route)}`),
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopyState('Copied full route smoke list');
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
            Open each route from here and confirm one clear page owner mounts. Copy local preview
            URLs when you want to test a route directly in the HTTP preview server.
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
          <Card key={group.title} eyebrow={group.eyebrow} title={group.title}>
            <p className="cl-home-group-copy">{group.copy}</p>

            <div className="cl-home-route-list">
              {group.routes.map((route) => (
                <article key={route.kind} className={`cl-home-route-card is-${group.status}`}>
                  <div className="cl-home-route-card-head">
                    <div>
                      <span className="cl-home-route-kind">crab://{route.kind}</span>
                      <h3>{route.label}</h3>
                    </div>
                    <span className="cl-home-route-risk">{route.risk}</span>
                  </div>

                  <p>{route.purpose}</p>

                  <div className="cl-home-route-actions">
                    <Button variant="secondary" onClick={() => open(route)}>
                      Open
                    </Button>
                    <Button variant="secondary" onClick={() => copyPreviewUrl(route)}>
                      Copy URL
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