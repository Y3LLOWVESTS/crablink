/**
 * RO:WHAT — Local root HTML editor/importer/template picker for the React crab://site workspace.
 * RO:WHY — Models site root document handling and replaces rough demo roots with polished templates.
 * RO:INTERACTS — SiteCreate, SiteRender, siteDraftModel root guard, siteTemplates.
 * RO:INVARIANTS — local root only; no storage put; no fake root CID; no image CID as site root.
 * RO:METRICS — none.
 * RO:CONFIG — draft rootHtml and rootDocumentCid fields.
 * RO:SECURITY — selected HTML is previewed in sandbox; scripts are stripped in preview.
 * RO:TEST — manual local HTML paste/file import/template insert smoke.
 */

import { useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import Field from '../../shared/components/Field.jsx';
import TextArea from '../../shared/components/TextArea.jsx';
import { SITE_TEMPLATES, buildSiteTemplatePatch } from './siteTemplates.js';

export default function SiteRootUpload({ draftState }) {
  const { draft, updateDraft, replaceDraft, stats } = draftState;
  const [selectedTemplateId, setSelectedTemplateId] = useState(SITE_TEMPLATES[0]?.id || '');
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

  function applyTemplate(templateId = selectedTemplateId) {
    const nextDraft = buildSiteTemplatePatch(templateId, draft);
    replaceDraft(nextDraft);
  }

  function clearRootHtml() {
    updateDraft('rootHtml', '');
  }

  return (
    <Card
      eyebrow="Root document"
      title="Static root HTML"
      className="site-root-card"
      actions={
        <div className="site-root-actions">
          <Badge tone={rootGuard.ok ? rootGuard.level : 'warning'}>
            {rootGuard.ok ? 'guard ok' : 'needs attention'}
          </Badge>
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

      <section className="site-template-panel" aria-label="Site root templates">
        <div className="site-template-header">
          <div>
            <span>Template starter</span>
            <strong>Choose a cleaner root page</strong>
          </div>

          <div className="site-template-controls">
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              aria-label="Site template"
            >
              {SITE_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>

            <Button variant="secondary" onClick={() => applyTemplate()}>
              Insert Template
            </Button>
          </div>
        </div>

        <div className="site-template-grid">
          {SITE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              className={`site-template-card ${template.id === selectedTemplateId ? 'is-selected' : ''}`}
              onClick={() => {
                setSelectedTemplateId(template.id);
                applyTemplate(template.id);
              }}
            >
              <span>{template.tone}</span>
              <strong>{template.name}</strong>
              <small>{template.description}</small>
            </button>
          ))}
        </div>
      </section>

      <div className={`site-root-guard is-${rootGuard.level || 'warning'}`}>
        <strong>Root guard</strong>
        <span>{rootGuard.reason}</span>
      </div>

      <Field label="Root HTML" help="Scripts will not execute in the React preview. Future facet/code routes need a separate security model.">
        <TextArea
          value={draft.rootHtml}
          onChange={updateRootHtml}
          rows={12}
          spellCheck={false}
        />
      </Field>

      <div className="site-root-actions lower">
        <Button variant="secondary" onClick={() => applyTemplate()}>
          Reset to Selected Template
        </Button>
        <Button variant="ghost" onClick={clearRootHtml}>
          Clear Root HTML
        </Button>
      </div>

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