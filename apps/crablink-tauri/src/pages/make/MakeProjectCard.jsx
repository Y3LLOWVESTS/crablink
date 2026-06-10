/**
 * RO:WHAT — Local project metadata and advanced settings card for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; extracts form-heavy project controls from MakePage.
 * RO:INTERACTS — MakePage.jsx, MakePrompterEditor.jsx, makeDraftModel.js, shared form/card controls.
 * RO:INVARIANTS — local draft metadata only; no backend publish truth; no wallet/ledger mutation; no fake receipts/CIDs.
 * RO:METRICS — none.
 * RO:CONFIG — local title, access-price hint, canvas, scene, microphone, PiP, tags, and notes fields.
 * RO:SECURITY — scripts/notes are local draft text; no private keys, capabilities, balances, or spend authority.
 * RO:TEST — npm run build; manual crab://make project form and teleprompter smoke.
 */

import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import Field from '../../shared/components/Field.jsx';
import TextArea from '../../shared/components/TextArea.jsx';
import TextInput from '../../shared/components/TextInput.jsx';

import MakePrompterEditor from './MakePrompterEditor.jsx';
import { CheckToggle } from './MakeSharedControls.jsx';
import {
  MAKE_OUTPUT_PRESETS,
  MAKE_PIP_STYLES,
  MAKE_SCENES,
} from './makeDraftModel.js';

export default function MakeProjectCard({ draft, hasPrompterScript, onReset, onTogglePrompterRun, onUpdate, outputPreset, prompterRunning }) {
  return (
    <Card
      eyebrow="Project"
      title="Name and shape the finished video"
      className="make-project-card"
      actions={<Button variant="secondary" size="sm" onClick={onReset}>Reset</Button>}
    >
      <div className="make-project-prime">
        <Field label="Title" help="Local draft title. Backend title is created later through the video publish flow.">
          <TextInput
            value={draft.title}
            maxLength={90}
            placeholder="Example: CrabLink creator studio demo"
            onChange={(event) => onUpdate({ title: event.target.value })}
          />
        </Field>

        <Field label="Access price" help="Integer ROC display hint for the later video mint flow.">
          <TextInput
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft.accessPriceRoc}
            onChange={(event) => onUpdate({ accessPriceRoc: event.target.value })}
          />
        </Field>
      </div>

      <details className="make-disclosure">
        <summary>
          <span>Advanced project details</span>
          <small>description, tags, scene, canvas, audio, prompter, PiP, notes</small>
        </summary>

        <div className="make-disclosure-body">
          <Field label="Description">
            <TextArea
              rows={4}
              value={draft.description}
              placeholder="What will viewers get from this finished video?"
              onChange={(event) => onUpdate({ description: event.target.value })}
            />
          </Field>

          <MakePrompterEditor
            draft={draft}
            hasPrompterScript={hasPrompterScript}
            onToggleRun={onTogglePrompterRun}
            onUpdate={onUpdate}
            running={prompterRunning}
          />

          <div className="make-form-grid">
            <Field label="Tags" help="Comma-separated local draft tags.">
              <TextInput
                value={draft.tagsText}
                placeholder="tutorial, behind-the-scenes, music"
                onChange={(event) => onUpdate({ tagsText: event.target.value })}
              />
            </Field>

            <Field label="Canvas preset" help={`${outputPreset.width}×${outputPreset.height}`}>
              <select
                className="cl-input"
                value={draft.outputPreset}
                onChange={(event) => onUpdate({ outputPreset: event.target.value })}
              >
                {MAKE_OUTPUT_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>{preset.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="make-form-grid">
            <Field label="Scene">
              <select
                className="cl-input"
                value={draft.selectedScene}
                onChange={(event) => onUpdate({ selectedScene: event.target.value })}
              >
                {MAKE_SCENES.map((scene) => (
                  <option key={scene.value} value={scene.value}>{scene.label}</option>
                ))}
              </select>
            </Field>

            <Field label="FPS">
              <select
                className="cl-input"
                value={draft.targetFps}
                onChange={(event) => onUpdate({ targetFps: event.target.value })}
              >
                {[24, 30, 48, 60].map((fps) => (
                  <option key={fps} value={fps}>{fps}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="make-toggle-grid" aria-label="Make audio controls">
            <CheckToggle
              checked={draft.includeMic}
              label="Microphone"
              onChange={(includeMic) => onUpdate({ includeMic })}
            />
            <CheckToggle
              checked={draft.echoCancellation}
              label="Echo cancel"
              onChange={(echoCancellation) => onUpdate({ echoCancellation })}
            />
            <CheckToggle
              checked={draft.noiseSuppression}
              label="Noise suppress"
              onChange={(noiseSuppression) => onUpdate({ noiseSuppression })}
            />
            <CheckToggle
              checked={draft.autoGainControl}
              label="Auto gain"
              onChange={(autoGainControl) => onUpdate({ autoGainControl })}
            />
          </div>

          <div className="make-form-grid">
            <Field label="PiP style" help="Only used in Screen + PiP mode.">
              <select
                className="cl-input"
                value={draft.pipStyle}
                onChange={(event) => {
                  const pipStyle = event.target.value;
                  onUpdate({
                    pipStyle,
                    pipCutoutEnabled: pipStyle === 'cutout',
                    pipCutoutBackground: pipStyle === 'cutout' ? draft.pipCutoutBackground : false,
                  });
                }}
              >
                {MAKE_PIP_STYLES.map((style) => (
                  <option key={style.value} value={style.value}>{style.label}</option>
                ))}
              </select>
            </Field>

            <Field label="PiP corner">
              <select
                className="cl-input"
                value={draft.pipCorner}
                onChange={(event) => onUpdate({ pipCorner: event.target.value })}
              >
                <option value="top-left">Top left</option>
                <option value="top-right">Top right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-right">Bottom right</option>
              </select>
            </Field>

            <Field label="PiP size" help="Percent of canvas width.">
              <input
                className="cl-input"
                type="range"
                min="18"
                max="42"
                value={draft.pipSize}
                onChange={(event) => onUpdate({ pipSize: event.target.value })}
              />
            </Field>
          </div>

          <Field label="Creator notes" help="Private local notes; not included in backend truth until a future explicit publish path exists.">
            <TextArea
              rows={3}
              value={draft.creatorNotes}
              placeholder="Shot list, talking points, edit reminders..."
              onChange={(event) => onUpdate({ creatorNotes: event.target.value })}
            />
          </Field>
        </div>
      </details>
    </Card>
  );
}
