/**
 * RO:WHAT — Builder form for the React crab://game local game manifest workspace.
 * RO:WHY — Captures game metadata, runtime policy, saves, sessions, economics, and linked assets without execution.
 * RO:INTERACTS — GamePage draft state, GameAssets.jsx, gameDraftModel.js, shared creator components.
 * RO:INVARIANTS — form state is local only; no game fetch, no runtime launch, no saves, no sessions, no wallet mutation.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — crab URLs are inert draft strings; playable runtime remains future sandbox-only.
 * RO:TEST — npm run build; check-react-lane; manual form smoke for crab://game.
 */

import ActionBar from '../../shared/components/ActionBar.jsx';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import DraftStatsPanel from '../../shared/components/DraftStatsPanel.jsx';
import Field from '../../shared/components/Field.jsx';
import ManifestPreviewPanel from '../../shared/components/ManifestPreviewPanel.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import SegmentedControl from '../../shared/components/SegmentedControl.jsx';
import TextArea from '../../shared/components/TextArea.jsx';
import TextInput from '../../shared/components/TextInput.jsx';
import GameAssets, { GameAssetPlanPreview } from './GameAssets.jsx';
import {
  GAME_ACCESS_OPTIONS,
  GAME_ECONOMY_OPTIONS,
  GAME_ENGINE_OPTIONS,
  GAME_EXECUTION_OPTIONS,
  GAME_KIND_OPTIONS,
  GAME_MODERATION_OPTIONS,
  GAME_MULTIPLAYER_OPTIONS,
  GAME_NETWORK_OPTIONS,
  GAME_PAYOUT_OPTIONS,
  GAME_PLATFORM_OPTIONS,
  GAME_POLICY_OPTIONS,
  GAME_PROFILE_OPTIONS,
  GAME_RATING_OPTIONS,
  GAME_RELEASE_OPTIONS,
  GAME_REVIEW_OPTIONS,
  GAME_RUNTIME_OPTIONS,
  GAME_SANDBOX_OPTIONS,
  GAME_SAVE_OWNERSHIP_OPTIONS,
  GAME_SAVE_POLICY_OPTIONS,
  GAME_SESSION_OPTIONS,
  GAME_STORAGE_OPTIONS,
  GAME_VIEW_OPTIONS,
  GAME_WALLET_OPTIONS,
  labelFromSnake,
} from './gameDraftModel.js';

export default function GameDraft({ app, draftState }) {
  const {
    draft,
    updateDraft,
    clearDraft,
    viewMode,
    setViewMode,
    manifest,
    manifestJson,
    completeness,
  } = draftState;

  return (
    <Card
      eyebrow="Local builder"
      title="Game manifest draft"
      className="game-draft-card"
      actions={
        <SegmentedControl
          options={GAME_VIEW_OPTIONS}
          value={viewMode}
          onChange={setViewMode}
          ariaLabel="Game workspace mode"
          size="sm"
        />
      }
    >
      <div className="game-draft-intro">
        <Badge tone="warning">Local only</Badge>
        <Badge tone="neutral">crab://game</Badge>
        <Badge tone="neutral">No execution</Badge>
        <Badge tone="neutral">No wallet action</Badge>
      </div>

      <div className="game-form-grid">
        <Field label="Game title" help="Human-facing game title for this local manifest draft.">
          <TextInput
            value={draft.gameTitle}
            onChange={(event) => updateDraft('gameTitle', event.target.value)}
            placeholder="Crab Quest"
            maxLength={120}
          />
        </Field>

        <Field label="Creator / studio display" help="Display label only. Backend identity truth comes later.">
          <TextInput
            value={draft.creatorDisplay}
            onChange={(event) => updateDraft('creatorDisplay', event.target.value)}
            placeholder={app?.settings?.handle || app?.settings?.passportSubject || '@studio'}
            maxLength={90}
          />
        </Field>

        <Field label="Studio passport" help="Optional future passport subject or @username hint. Not verified here.">
          <TextInput
            value={draft.studioPassport}
            onChange={(event) => updateDraft('studioPassport', event.target.value)}
            placeholder={app?.settings?.passportSubject || '@studio'}
            spellCheck={false}
          />
        </Field>

        <Field label="Game kind" help="Planning field only; this route does not run the game.">
          <select
            className="cl-select"
            value={draft.gameKind}
            onChange={(event) => updateDraft('gameKind', event.target.value)}
          >
            {GAME_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Runtime" help="Future runtime declaration only. No runtime is launched here.">
          <select
            className="cl-select"
            value={draft.runtime}
            onChange={(event) => updateDraft('runtime', event.target.value)}
          >
            {GAME_RUNTIME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Engine" help="Engine hint only. No engine-specific loader is active.">
          <select
            className="cl-select"
            value={draft.engine}
            onChange={(event) => updateDraft('engine', event.target.value)}
          >
            {GAME_ENGINE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Platform mode" help="Platform planning only. This page is still just a manifest builder.">
          <select
            className="cl-select"
            value={draft.platformMode}
            onChange={(event) => updateDraft('platformMode', event.target.value)}
          >
            {GAME_PLATFORM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Content rating" help="Local rating label only; no policy review is claimed.">
          <select
            className="cl-select"
            value={draft.contentRating}
            onChange={(event) => updateDraft('contentRating', event.target.value)}
          >
            {GAME_RATING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Release mode" help="Local release status only. No backend release is claimed.">
          <select
            className="cl-select"
            value={draft.releaseMode}
            onChange={(event) => updateDraft('releaseMode', event.target.value)}
          >
            {GAME_RELEASE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Review mode" help="No review approval exists in this local route.">
          <select
            className="cl-select"
            value={draft.reviewMode}
            onChange={(event) => updateDraft('reviewMode', event.target.value)}
          >
            {GAME_REVIEW_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Description" help="Plain-language pitch, gameplay notes, and safety expectations.">
        <TextArea
          value={draft.description}
          onChange={(event) => updateDraft('description', event.target.value)}
          rows={5}
          placeholder="Describe the game, core gameplay, intended audience, and what this draft does not yet do..."
        />
      </Field>

      <GameAssets draft={draft} updateDraft={updateDraft} />

      <section className="game-form-section" aria-label="Game runtime policy">
        <div className="game-form-section-head">
          <div>
            <p className="cl-eyebrow">Runtime facet</p>
            <h3>Execution, sandbox, policy, and permissions</h3>
          </div>
          <Badge tone="warning" uppercase={false}>
            no runtime active
          </Badge>
        </div>

        <div className="game-form-grid">
          <Field label="Execution mode" help="This route does not execute the game in any mode.">
            <select
              className="cl-select"
              value={draft.executionMode}
              onChange={(event) => updateDraft('executionMode', event.target.value)}
            >
              {GAME_EXECUTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Sandbox mode" help="Playable games must be sandbox-gated.">
            <select
              className="cl-select"
              value={draft.sandboxMode}
              onChange={(event) => updateDraft('sandboxMode', event.target.value)}
            >
              {GAME_SANDBOX_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Policy mode" help="Default posture should remain deny-by-default.">
            <select
              className="cl-select"
              value={draft.policyMode}
              onChange={(event) => updateDraft('policyMode', event.target.value)}
            >
              {GAME_POLICY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Network permission" help="No network by default. Multiplayer needs explicit future policy.">
            <select
              className="cl-select"
              value={draft.networkPolicy}
              onChange={(event) => updateDraft('networkPolicy', event.target.value)}
            >
              {GAME_NETWORK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Storage permission" help="Public asset reads and save writes must be separated.">
            <select
              className="cl-select"
              value={draft.storagePolicy}
              onChange={(event) => updateDraft('storagePolicy', event.target.value)}
            >
              {GAME_STORAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Wallet permission" help="No wallet access by default. No silent spend ever.">
            <select
              className="cl-select"
              value={draft.walletPolicy}
              onChange={(event) => updateDraft('walletPolicy', event.target.value)}
            >
              {GAME_WALLET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Profile permission" help="Private passport/alt mappings must not be exposed.">
            <select
              className="cl-select"
              value={draft.profilePolicy}
              onChange={(event) => updateDraft('profilePolicy', event.target.value)}
            >
              {GAME_PROFILE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Required capabilities" help="Comma-separated future capability labels.">
            <TextInput
              value={draft.requiredCapabilities}
              onChange={(event) => updateDraft('requiredCapabilities', event.target.value)}
              placeholder="game:read, facet:preview"
              spellCheck={false}
            />
          </Field>
        </div>

        <div className="game-signal-grid">
          <Field label="Allowed routes" help="Comma-separated declared routes. Planning field only.">
            <TextArea
              value={draft.allowedRoutes}
              onChange={(event) => updateDraft('allowedRoutes', event.target.value)}
              rows={4}
              placeholder="launch_preview, render_title_screen"
            />
          </Field>

          <Field label="Allowed actions" help="Comma-separated declared actions. Planning field only.">
            <TextArea
              value={draft.allowedActions}
              onChange={(event) => updateDraft('allowedActions', event.target.value)}
              rows={4}
              placeholder="render_static_preview, read_public_asset_refs"
            />
          </Field>

          <Field label="Denied actions" help="Keep dangerous game/runtime actions explicit.">
            <TextArea
              value={draft.deniedActions}
              onChange={(event) => updateDraft('deniedActions', event.target.value)}
              rows={5}
              placeholder="wallet_spend, hidden_session_tracking, storage_write..."
            />
          </Field>

          <div className="game-facet-stats">
            <div>
              <span>Routes</span>
              <strong>{draftState.stats.allowed_routes_count || 0}</strong>
            </div>
            <div>
              <span>Actions</span>
              <strong>{draftState.stats.allowed_actions_count || 0}</strong>
            </div>
            <div>
              <span>Denied</span>
              <strong>{draftState.stats.denied_actions_count || 0}</strong>
            </div>
            <div>
              <span>Caps</span>
              <strong>{draftState.stats.required_capabilities_count || 0}</strong>
            </div>
          </div>
        </div>

        <div className="game-form-grid game-form-grid-compact">
          <Field label="Memory MB" help="Future resource limit. Parsed as integer.">
            <TextInput
              inputMode="numeric"
              value={draft.memoryLimitMb}
              onChange={(event) => updateDraft('memoryLimitMb', event.target.value.replace(/[^\d]/g, ''))}
              placeholder="256"
              spellCheck={false}
            />
          </Field>

          <Field label="CPU ms" help="Future resource limit. Parsed as integer.">
            <TextInput
              inputMode="numeric"
              value={draft.cpuLimitMs}
              onChange={(event) => updateDraft('cpuLimitMs', event.target.value.replace(/[^\d]/g, ''))}
              placeholder="500"
              spellCheck={false}
            />
          </Field>

          <Field label="Save KB" help="Future save data cap. Parsed as integer.">
            <TextInput
              inputMode="numeric"
              value={draft.saveLimitKb}
              onChange={(event) => updateDraft('saveLimitKb', event.target.value.replace(/[^\d]/g, ''))}
              placeholder="1024"
              spellCheck={false}
            />
          </Field>

          <Field label="Request limit" help="Zero means no outbound requests in this draft posture.">
            <TextInput
              inputMode="numeric"
              value={draft.requestLimit}
              onChange={(event) => updateDraft('requestLimit', event.target.value.replace(/[^\d]/g, ''))}
              placeholder="0"
              spellCheck={false}
            />
          </Field>
        </div>
      </section>

      <section className="game-form-section" aria-label="Game saves sessions and economy">
        <div className="game-form-section-head">
          <div>
            <p className="cl-eyebrow">Saves, sessions, and economy</p>
            <h3>Player data and value-plane policy</h3>
          </div>
          <Badge tone="warning" uppercase={false}>
            backend inactive
          </Badge>
        </div>

        <div className="game-form-grid">
          <Field label="Save-data policy" help="No save data is written from this route.">
            <select
              className="cl-select"
              value={draft.saveDataPolicy}
              onChange={(event) => updateDraft('saveDataPolicy', event.target.value)}
            >
              {GAME_SAVE_POLICY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Save ownership" help="Planning field only. No save ownership is written.">
            <select
              className="cl-select"
              value={draft.saveOwnership}
              onChange={(event) => updateDraft('saveOwnership', event.target.value)}
            >
              {GAME_SAVE_OWNERSHIP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Multiplayer policy" help="No lobbies or sessions are created here.">
            <select
              className="cl-select"
              value={draft.multiplayerPolicy}
              onChange={(event) => updateDraft('multiplayerPolicy', event.target.value)}
            >
              {GAME_MULTIPLAYER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Session policy" help="Session state remains inactive in this route.">
            <select
              className="cl-select"
              value={draft.sessionPolicy}
              onChange={(event) => updateDraft('sessionPolicy', event.target.value)}
            >
              {GAME_SESSION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Economy policy" help="No in-game spend, wallet hold, or capture happens here.">
            <select
              className="cl-select"
              value={draft.economyPolicy}
              onChange={(event) => updateDraft('economyPolicy', event.target.value)}
            >
              {GAME_ECONOMY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Access mode" help="Planning field only. No paid/free play route is active.">
            <select
              className="cl-select"
              value={draft.accessMode}
              onChange={(event) => updateDraft('accessMode', event.target.value)}
            >
              {GAME_ACCESS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Payout mode" help="Planning field only. No payout or reward is active.">
            <select
              className="cl-select"
              value={draft.payoutMode}
              onChange={(event) => updateDraft('payoutMode', event.target.value)}
            >
              {GAME_PAYOUT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Moderation mode" help="Planning field only. No player reports or chat moderation exists here.">
            <select
              className="cl-select"
              value={draft.moderationMode}
              onChange={(event) => updateDraft('moderationMode', event.target.value)}
            >
              {GAME_MODERATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tags" help="Comma-separated draft tags. These are not indexed here.">
            <TextInput
              value={draft.tags}
              onChange={(event) => updateDraft('tags', event.target.value)}
              placeholder="game, arcade, demo"
            />
          </Field>
        </div>
      </section>

      {viewMode === 'developer' && (
        <div className="game-inline-dev">
          <ManifestPreviewPanel
            manifest={manifest}
            label="crablink.local.game-draft.v1"
            title="Inline manifest"
            initiallyOpen={false}
          />
        </div>
      )}

      <ActionBar align="between" className="game-actions">
        <div className="game-action-status">
          <Badge tone={completeness === 100 ? 'success' : 'neutral'}>
            {completeness}% complete
          </Badge>
          <span>Local game manifest draft</span>
        </div>

        <div className="game-action-buttons">
          <CopyButton
            text={manifestJson}
            label="Copy manifest JSON"
            successLabel="Manifest copied"
            errorLabel="Copy unavailable"
            variant="secondary"
          />
          <Button variant="secondary" onClick={clearDraft}>
            Clear draft
          </Button>
        </div>
      </ActionBar>
    </Card>
  );
}

export function GameSidePanel({ draftState }) {
  const { draft, viewMode, stats, manifest, completeness } = draftState;
  const linkedAssets = manifest?.linked_assets || [];

  return (
    <>
      <DraftStatsPanel
        completeness={completeness}
        stats={[
          { label: 'Description words', value: stats.description_words || 0 },
          { label: 'Asset refs', value: stats.linked_asset_count || 0 },
          { label: 'Bundles', value: stats.bundle_count || 0 },
          { label: 'Media refs', value: stats.media_count || 0 },
          { label: 'Denied actions', value: stats.denied_actions_count || 0 },
          { label: 'Safety', value: `${stats.safety_score || 0}%` },
        ]}
        notes={['local draft', 'no execution', 'no spend']}
      />

      <RouteTruthPanel
        routeKind="game"
        tone="warning"
        title="Game backend inactive"
        copy="This route drafts a game manifest only. It does not fetch bundles, instantiate WASM, launch a sandbox, write saves, create sessions, publish manifests, or spend ROC."
      />

      {viewMode === 'developer' ? (
        <ManifestPreviewPanel
          manifest={manifest}
          label="crablink.local.game-draft.v1"
          title="Manifest JSON"
          initiallyOpen
        />
      ) : (
        <Card eyebrow="Builder preview" title={draft.gameTitle || 'Untitled game'}>
          <GamePreview draft={draft} manifest={manifest} stats={stats} />
        </Card>
      )}

      <Card eyebrow="Asset plan" title="Linked game assets">
        <GameAssetPlanPreview linkedAssets={linkedAssets} compact />
      </Card>
    </>
  );
}

function GamePreview({ draft, manifest, stats }) {
  const metadata = manifest?.metadata || {};
  const runtime = manifest?.runtime_policy || {};
  const economy = manifest?.economy_policy || {};
  const save = manifest?.save_policy || {};
  const tags = metadata.tags || [];

  return (
    <article className="game-preview" aria-label="Safe game manifest preview">
      <section className="game-preview-hero">
        <div className="game-preview-cover" aria-label="Game cover preview placeholder">
          <span>{draft.coverImageCrabUrl ? 'Cover image reference set' : 'No cover image yet'}</span>
        </div>

        <div className="game-preview-copy">
          <p>
            {draft.creatorDisplay || 'Unverified studio'} · {labelFromSnake(draft.gameKind)}
          </p>
          <h3>{draft.gameTitle || 'Your game title'}</h3>
          <span>{draft.description || 'Describe the game and gameplay here.'}</span>
        </div>
      </section>

      <div className="game-preview-tags">
        <Badge tone="warning" uppercase={false}>
          No runtime
        </Badge>
        <Badge tone="neutral" uppercase={false}>
          {labelFromSnake(draft.runtime)}
        </Badge>
        {tags.length > 0 ? (
          tags.map((tag) => (
            <Badge key={tag} tone="neutral" uppercase={false}>
              {tag}
            </Badge>
          ))
        ) : (
          <Badge tone="neutral">No tags yet</Badge>
        )}
      </div>

      <div className="game-summary-list">
        <SummaryRow label="Execution" value={labelFromSnake(runtime.execution_mode)} />
        <SummaryRow label="Sandbox" value={labelFromSnake(runtime.sandbox_mode)} />
        <SummaryRow label="Economy" value={labelFromSnake(economy.mode)} />
        <SummaryRow label="Save policy" value={labelFromSnake(save.mode)} />
        <SummaryRow label="Asset refs" value={String(stats.linked_asset_count || 0)} />
        <SummaryRow label="Playable" value="No" />
      </div>

      <section className="game-safety-list" aria-label="Game safety contract">
        <h3>Safety contract</h3>
        <ul>
          <li>Game assets are inert references in this local draft.</li>
          <li>No runtime bytes are fetched, compiled, interpreted, or executed.</li>
          <li>No save data, sessions, player state, or wallet actions happen here.</li>
          <li>Playable games require facet.toml, capabilities, resource limits, policy, and sandboxing.</li>
        </ul>
      </section>
    </article>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="game-summary-row">
      <span>{label}</span>
      <strong>{value || 'Not set'}</strong>
    </div>
  );
}