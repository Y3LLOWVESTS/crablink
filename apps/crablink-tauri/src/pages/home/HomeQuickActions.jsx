/**
 * RO:WHAT — Home quick-action route cards for CrabLink React built-ins.
 * RO:WHY — App Integration; Concerns: DX; makes route smoke testing fast, visible, and honest.
 * RO:INTERACTS — app.navigate, built-in page owners, extension-origin React, local HTTP fallback preview.
 * RO:INVARIANTS — navigation/copy only; no backend mutation; no fake publication; no ROC action; no chain action.
 * RO:METRICS — none.
 * RO:CONFIG — built-in route list below plus optional proof routes from HomePage.
 * RO:SECURITY — no paid or privileged action; copied URLs are test helpers only.
 * RO:TEST — manually click every route card after build/package/reload.
 */

import { useMemo, useState } from 'react';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';

const LOCAL_PREVIEW_ORIGIN = 'http://127.0.0.1:4173';
const DEFAULT_PROOF_IMAGE =
  'crab://6e343cbcbcd233a72ce45b197d1c45caea862480221ef0f7e4e4360f17e1fce0.image';
const DEFAULT_PROOF_SITE = 'crab://ron7';

function routeGroups({ proofSite, proofImage }) {
  return [
    {
      title: 'Current proof routes',
      eyebrow: 'Regression anchors',
      status: 'protected',
      copy:
        'Use these first after every build. They prove named-site resolving, typed asset resolving, profile route ownership, local library display, text readiness, and QuickChain gating.',
      routes: [
        {
          kind: 'site-proof',
          label: 'Named site proof',
          displayRoute: proofSite || DEFAULT_PROOF_SITE,
          route: proofSite || DEFAULT_PROOF_SITE,
          purpose: 'gateway/index named-site resolve and scriptless site rendering',
          risk: 'gateway truth',
        },
        {
          kind: 'image-proof',
          label: 'React image proof',
          displayRoute: proofImage || DEFAULT_PROOF_IMAGE,
          route: proofImage || DEFAULT_PROOF_IMAGE,
          purpose: 'typed b3-backed image asset resolve through gateway',
          risk: 'asset truth',
        },
        {
          kind: 'profile',
          label: 'Profile',
          displayRoute: 'crab://profile',
          purpose: 'local profile workspace, passport drawer, identity truth boundary',
          risk: 'identity truth',
        },
        {
          kind: 'library',
          label: 'Library',
          displayRoute: 'crab://library',
          purpose: 'local profiles, sites, assets, and receipts display cache',
          risk: 'display cache only',
        },
        {
          kind: 'text',
          label: 'Text Primitive Readiness',
          displayRoute: 'crab://text',
          purpose: 'post/comment/article proof tracking before QuickChain is allowed to begin',
          risk: 'pre-QuickChain checklist',
        },
        {
          kind: 'quickchain',
          label: 'QuickChain Readiness',
          displayRoute: 'crab://quickchain',
          purpose: 'readiness checklist proving QuickChain is correctly deferred until internal ROC gates are done',
          risk: 'future blueprint only',
        },
        {
          kind: 'operator',
          label: 'Service Node Operator',
          displayRoute: 'crab://operator',
          purpose: 'optional local/remote read-only Service Node connection and canonical status',
          risk: 'explicit operator mode',
        },
        {
          kind: 'home',
          label: 'Home',
          displayRoute: 'crab://home',
          purpose: 'React route smoke dashboard and migration status',
          risk: 'navigation only',
        },
      ],
    },
    {
      title: 'Protected / late cleanup',
      eyebrow: 'Parity routes',
      status: 'protected',
      copy:
        'These routes touch proven product flows or identity surfaces. Keep them protected while NEXT_LEVEL backend primitives are added one at a time.',
      routes: [
        {
          kind: 'site',
          label: 'Site Workspace',
          purpose: 'site create/open/render, manifest drawer, root upload, crab-image embeds',
          risk: 'paid/site parity',
        },
        {
          kind: 'image',
          label: 'Image Workspace',
          purpose: 'paid image prepare, hold, upload, receipt, renditions',
          risk: 'paid upload parity',
        },
        {
          kind: 'asset',
          label: 'Generic Asset',
          displayRoute: proofImage || DEFAULT_PROOF_IMAGE,
          route: proofImage || DEFAULT_PROOF_IMAGE,
          purpose: 'typed b3 asset hydration, route diagnostics, backend-returned proof',
          risk: 'gateway truth',
        },
        {
          kind: 'problem-check',
          label: 'Missing Site Check',
          displayRoute: 'crab://definitely-missing-site',
          route: 'crab://definitely-missing-site',
          purpose: 'named-site 404 panel should be structured and honest',
          risk: 'error UX',
        },
      ],
    },
    {
      title: 'Text and identity primitives',
      eyebrow: 'Local draft routes',
      status: 'local',
      copy:
        'Low-risk creator surfaces. Post/comment/article have frontend gateway lanes, but only backend responses may create CIDs, receipts, manifests, and index pointers.',
      routes: [
        {
          kind: 'post',
          label: 'Post',
          purpose: 'short text/social post asset draft and publish lane',
          risk: 'backend proof required',
        },
        {
          kind: 'comment',
          label: 'Comment',
          purpose: 'comment asset draft with parent/thread/site relationship',
          risk: 'backend proof required',
        },
        {
          kind: 'article',
          label: 'Article',
          purpose: 'long-form article manifest, hero image, tags, access',
          risk: 'backend proof required',
        },
        {
          kind: 'lyrics',
          label: 'Lyrics',
          purpose: 'standalone lyrics asset, rights/versioning boundary',
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
  ];
}

export default function HomeQuickActions({ app, proofSite = DEFAULT_PROOF_SITE, proofImage = DEFAULT_PROOF_IMAGE }) {
  const [copyState, setCopyState] = useState('');
  const groups = useMemo(() => routeGroups({ proofSite, proofImage }), [proofSite, proofImage]);
  const allRoutes = useMemo(
    () => groups.flatMap((group) => group.routes.map((route) => route.route || `crab://${route.kind}`)),
    [groups],
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
      setCopyState(`Copied HTTP fallback URL for ${crabRoute}`);
    } catch (_error) {
      setCopyState('Clipboard unavailable in this browser context');
    }

    window.setTimeout(() => setCopyState(''), 2200);
  }

  async function copySmokeList() {
    const lines = [
      'CrabLink React route smoke list',
      '',
      'Default path:',
      'cd /Users/mymac/Desktop/crablink',
      'npm run build',
      'scripts/check-react-lane.sh',
      'scripts/check-chrome.sh',
      'scripts/package-chrome.sh',
      'scripts/make_codebundle.sh',
      '',
      'Then reload the unpacked extension staging folder and click/open the React lane.',
      '',
      'Optional HTTP fallback preview:',
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
    <section className="cl-home-actions" aria-label="Route quick actions">
      <div className="cl-home-actions-head">
        <div>
          <p className="cl-eyebrow">Route quick actions</p>
          <h2>Built-in crab:// routes</h2>
          <p>
            Open each route from here and confirm one clear page owner mounts. Copy HTTP fallback URLs only when
            you need local preview debugging outside extension origin.
          </p>
        </div>

        <div className="cl-home-actions-tools">
          <Button variant="secondary" onClick={copySmokeList}>
            Copy smoke list
          </Button>
          {copyState && <span>{copyState}</span>}
        </div>
      </div>

      {groups.map((group) => (
        <Card
          key={group.title}
          eyebrow={group.eyebrow}
          title={group.title}
          className="cl-scaffold-card"
        >
          <p>{group.copy}</p>

          <div className="cl-home-route-list">
            {group.routes.map((route) => (
              <article key={`${group.title}:${route.kind}:${route.route || ''}`} className="cl-home-route-card">
                <header className="cl-home-route-card-head">
                  <div>
                    <code>{route.displayRoute || route.route || `crab://${route.kind}`}</code>
                    <strong>{route.label}</strong>
                  </div>
                  <span>{route.risk}</span>
                </header>

                <p>{route.purpose}</p>

                <div className="cl-home-route-actions">
                  <Button variant="primary" onClick={() => open(route)}>
                    Open
                  </Button>
                  <Button variant="secondary" onClick={() => copyPreviewUrl(route)}>
                    Copy HTTP fallback
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </Card>
      ))}
    </section>
  );
}

function buildPreviewUrl(crabRoute) {
  return `${LOCAL_PREVIEW_ORIGIN}/react.html?url=${encodeURIComponent(crabRoute)}`;
}