/**
 * RO:WHAT — Local root HTML editor/importer for the React crab://site workspace.
 * RO:WHY — Models site root document handling and guards against image-CID-as-root regressions.
 * RO:INTERACTS — SiteCreate, SiteRender, siteDraftModel root guard.
 * RO:INVARIANTS — local root only; no storage put; no fake root CID; no image CID as site root.
 * RO:METRICS — none.
 * RO:CONFIG — draft rootHtml and rootDocumentCid fields.
 * RO:SECURITY — selected HTML is previewed in sandbox; scripts are stripped in preview.
 * RO:TEST — manual local HTML paste/file import smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Card from '../../shared/components/Card.jsx';
import Field from '../../shared/components/Field.jsx';
import TextArea from '../../shared/components/TextArea.jsx';

export default function SiteRootUpload({ draftState }) {
  const { draft, updateDraft, stats } = draftState;
  const rootGuard = stats.rootGuard || { ok: false, level: 'warning', reason: 'Root document not checked.' };

  function updateRootHtml(event) {
    updateDraft('rootHtml', event.target.value);
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateDraft('rootHtml', String(reader.result || ''));
    };

    reader.readAsText(file);
  }

  return (
    <Card
      eyebrow="Root document"
      title="Static root HTML"
      className="site-root-card"
      actions={
        <div className="site-root-actions">
          <Badge tone={rootGuard.ok ? rootGuard.level : 'warning'}>{rootGuard.ok ? 'guard ok' : 'needs attention'}</Badge>
          <label className="site-file-button">
            Import HTML
            <input
              type="file"
              accept=".html,.htm,.txt,text/html,text/plain"
              onChange={handleFileChange}
            />
          </label>
        </div>
      }
    >
      <p className="site-section-copy">
        This root HTML is only a local preview. Real launch must store the root document
        through the backend flow and return a backend-verified root document CID.
      </p>

      <div className={`site-root-guard is-${rootGuard.level || 'warning'}`}>
        <strong>Root guard</strong>
        <span>{rootGuard.reason}</span>
      </div>

      <Field label="Root HTML" help="Scripts will not execute in the React preview. Future facet/code routes need a separate security model.">
        <TextArea
          value={draft.rootHtml}
          onChange={updateRootHtml}
          rows={10}
          spellCheck={false}
        />
      </Field>

      <div className="site-root-stats">
        <div>
          <span>Local bytes</span>
          <strong>{formatBytes(stats.rootHtmlBytes || 0)}</strong>
        </div>
        <div>
          <span>Root CID hint</span>
          <strong>{stats.hasRootCidHint ? 'present' : 'none'}</strong>
        </div>
      </div>
    </Card>
  );
}

function formatBytes(value) {
  const bytes = Number(value || 0);

  if (!bytes) {
    return '0 B';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}