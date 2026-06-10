/**
 * RO:WHAT — Local teleprompter editor for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; separates prompt script UI from the route container.
 * RO:INTERACTS — MakePage.jsx, MakeProjectCard local section, shared button/field/text-area controls.
 * RO:INVARIANTS — local draft text only; overlay is preview-only; no backend truth; no wallet/ledger mutation.
 * RO:METRICS — none.
 * RO:CONFIG — local teleprompter draft settings.
 * RO:SECURITY — no secrets should be stored in scripts intended for sharing; no capabilities or spend authority.
 * RO:TEST — npm run build; manual crab://make teleprompter editor smoke.
 */

import Button from '../../shared/components/Button.jsx';
import Field from '../../shared/components/Field.jsx';
import TextArea from '../../shared/components/TextArea.jsx';

import { CheckToggle } from './MakeSharedControls.jsx';

export default function MakePrompterEditor({ draft, hasPrompterScript, onToggleRun, onUpdate, running }) {
  return (
    <section className="make-prompter-editor" aria-label="Teleprompter">
      <div className="make-prompter-editor-head">
        <div>
          <p className="cl-eyebrow">Teleprompter</p>
          <h3>Preview-only script runner</h3>
          <span>
            This overlay sits above the preview for the creator. It is not drawn into the recorded canvas.
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onToggleRun}
          disabled={!draft.teleprompterEnabled || !hasPrompterScript}
        >
          {running ? 'Pause prompt' : 'Run prompt'}
        </Button>
      </div>

      <div className="make-toggle-grid make-prompter-toggle-row">
        <CheckToggle
          checked={draft.teleprompterEnabled}
          label="Show prompt"
          onChange={(teleprompterEnabled) => onUpdate({ teleprompterEnabled })}
        />

        <Field label="Position">
          <select
            className="cl-input"
            value={draft.teleprompterAnchor}
            onChange={(event) => onUpdate({ teleprompterAnchor: event.target.value })}
          >
            <option value="bottom">Bottom</option>
            <option value="top">Top</option>
          </select>
        </Field>

        <Field label="Scroll speed" help={`${draft.teleprompterSpeed}/90`}>
          <input
            className="cl-input"
            type="range"
            min="10"
            max="90"
            value={draft.teleprompterSpeed}
            onChange={(event) => onUpdate({ teleprompterSpeed: event.target.value })}
          />
        </Field>
      </div>

      <Field
        label="Script"
        help="Local draft text only. Keep secrets out of scripts you plan to copy or share."
      >
        <TextArea
          rows={7}
          value={draft.scriptText}
          placeholder="Paste a script, bullet points, or talking beats here..."
          onChange={(event) => onUpdate({ scriptText: event.target.value })}
        />
      </Field>
    </section>
  );
}
