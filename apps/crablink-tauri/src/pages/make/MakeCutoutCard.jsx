/**
 * RO:WHAT — Person cutout and background replacement controls for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; extracts local visual-effect card UI from MakePage.
 * RO:INTERACTS — MakePage.jsx, makeDraftModel.js, MakeRangeControl.jsx, shared field/button/badge controls.
 * RO:INVARIANTS — local compositor intent only; no backend truth; no wallet/ledger mutation; no fake receipts/CIDs.
 * RO:METRICS — none.
 * RO:CONFIG — local draft cutout, background, PiP, and mask tuning values.
 * RO:SECURITY — no secrets, capabilities, balances, native paths, or spend authority.
 * RO:TEST — npm run build; manual crab://make cutout/background controls smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Field from '../../shared/components/Field.jsx';
import TextInput from '../../shared/components/TextInput.jsx';

import MakeRangeControl from './MakeRangeControl.jsx';
import {
  MAKE_BACKGROUND_KINDS,
  MAKE_CUTOUT_POLARITIES,
  MAKE_PIP_STYLES,
} from './makeDraftModel.js';

export default function MakeCutoutCard({
  backgroundImageUrl,
  backgroundVideoUrl,
  compositorState,
  disabled,
  draft,
  onChooseBackgroundImage,
  onChooseBackgroundVideo,
  onClearBackgroundMedia,
  onUpdate,
}) {
  const cutoutOn =
    draft.backgroundRemovalMode === 'person_cutout' ||
    draft.personCutoutEnabled ||
    draft.selectedMode === 'camera_background';
  const backgroundKind = draft.backgroundKind || 'scene';
  const cutoutStatus = compositorState?.cutout?.status || 'idle';

  return (
    <div className="make-cutout-card" aria-label="Person cutout and background replacement controls">
      <div className="make-cutout-head">
        <div>
          <p className="cl-eyebrow">Person cutout</p>
          <h3>Background replacement</h3>
          <p>
            Local software cutout can place you over a studio scene, solid color, image, or looping
            video. It records into the canvas clip, but it creates no backend asset or receipt.
          </p>
        </div>
        <Badge tone={cutoutOn ? 'success' : 'neutral'}>
          {cutoutOn ? `Cutout ${cutoutStatus}` : 'Off'}
        </Badge>
      </div>

      <div className="make-cutout-grid">
        <label className="make-switch-row">
          <input
            checked={cutoutOn}
            disabled={disabled}
            type="checkbox"
            onChange={(event) =>
              onUpdate({
                selectedMode: event.target.checked ? 'camera_background' : 'camera',
                backgroundRemovalMode: event.target.checked ? 'person_cutout' : 'off',
                personCutoutEnabled: event.target.checked,
              })
            }
          />
          <span>
            <strong>Enable person cutout</strong>
            <small>Use software subject isolation for camera mode.</small>
          </span>
        </label>

        <Field
          label="PiP style"
          help={
            draft.selectedMode === 'screen_pip'
              ? 'Regular records the webcam card. Person cutout records only the locally isolated subject.'
              : 'Switch to Screen + PiP mode to record webcam over screen capture.'
          }
        >
          <select
            className="cl-input"
            disabled={disabled || draft.selectedMode !== 'screen_pip'}
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
              <option key={style.value} value={style.value}>
                {style.label}
              </option>
            ))}
          </select>
        </Field>

        <label className="make-switch-row">
          <input
            checked={draft.pipCutoutBackground === true}
            disabled={disabled || draft.selectedMode !== 'screen_pip' || draft.pipStyle !== 'cutout'}
            type="checkbox"
            onChange={(event) => onUpdate({ pipCutoutBackground: event.target.checked })}
          />
          <span>
            <strong>Cutout PiP mini-background</strong>
            <small>Optional local card behind the cutout subject. Off gives a cleaner floating-subject overlay.</small>
          </span>
        </label>

        <Field label="Background type">
          <select
            className="cl-input"
            disabled={disabled}
            value={backgroundKind}
            onChange={(event) => onUpdate({ backgroundKind: event.target.value })}
          >
            {MAKE_BACKGROUND_KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Mask polarity">
          <select
            className="cl-input"
            disabled={disabled}
            value={draft.cutoutMaskPolarity}
            onChange={(event) => onUpdate({ cutoutMaskPolarity: event.target.value })}
          >
            {MAKE_CUTOUT_POLARITIES.map((polarity) => (
              <option key={polarity.value} value={polarity.value}>
                {polarity.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Solid color">
          <TextInput
            disabled={disabled}
            type="color"
            value={draft.backgroundSolidColor}
            onChange={(event) => onUpdate({ backgroundSolidColor: event.target.value, backgroundKind: 'solid' })}
          />
        </Field>

        <MakeRangeControl
          disabled={disabled}
          label="Cutout feather"
          max="16"
          min="0"
          value={draft.cutoutFeather}
          onChange={(cutoutFeather) => onUpdate({ cutoutFeather })}
        />

        <MakeRangeControl
          disabled={disabled}
          label="Zoom"
          max="180"
          min="60"
          suffix="%"
          value={draft.subjectScale}
          onChange={(subjectScale) => onUpdate({ subjectScale })}
        />

        <MakeRangeControl
          disabled={disabled}
          label="Move X"
          max="100"
          min="-100"
          value={draft.subjectOffsetX}
          onChange={(subjectOffsetX) => onUpdate({ subjectOffsetX })}
        />

        <MakeRangeControl
          disabled={disabled}
          label="Move Y"
          max="100"
          min="-100"
          value={draft.subjectOffsetY}
          onChange={(subjectOffsetY) => onUpdate({ subjectOffsetY })}
        />

        <MakeRangeControl
          disabled={disabled}
          label="Brightness"
          max="180"
          min="40"
          suffix="%"
          value={draft.subjectBrightness}
          onChange={(subjectBrightness) => onUpdate({ subjectBrightness })}
        />

        <MakeRangeControl
          disabled={disabled}
          label="Contrast"
          max="200"
          min="40"
          suffix="%"
          value={draft.subjectContrast}
          onChange={(subjectContrast) => onUpdate({ subjectContrast })}
        />

        <MakeRangeControl
          disabled={disabled}
          label="Saturation"
          max="220"
          min="0"
          suffix="%"
          value={draft.subjectSaturation}
          onChange={(subjectSaturation) => onUpdate({ subjectSaturation })}
        />

        <label className="make-switch-row make-switch-row-tight">
          <input
            checked={draft.subjectMirror !== false}
            disabled={disabled}
            type="checkbox"
            onChange={(event) => onUpdate({ subjectMirror: event.target.checked })}
          />
          <span>
            <strong>Mirror camera</strong>
            <small>Preview-friendly local camera mirroring.</small>
          </span>
        </label>
      </div>

      <div className="make-background-picker-row">
        <label className="make-background-picker">
          <span>Choose image background</span>
          <input
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={disabled}
            type="file"
            onChange={(event) => {
              onChooseBackgroundImage(event.target.files?.[0] || null);
              event.target.value = '';
            }}
          />
        </label>

        <label className="make-background-picker">
          <span>Choose video background</span>
          <input
            accept="video/*"
            disabled={disabled}
            type="file"
            onChange={(event) => {
              onChooseBackgroundVideo(event.target.files?.[0] || null);
              event.target.value = '';
            }}
          />
        </label>

        <Button
          disabled={disabled}
          size="sm"
          variant="secondary"
          onClick={() =>
            onUpdate({
              subjectMirror: true,
              subjectScale: 100,
              subjectOffsetX: 0,
              subjectOffsetY: 0,
              subjectBrightness: 100,
              subjectContrast: 100,
              subjectSaturation: 100,
              cutoutFeather: 3,
              cutoutOpacity: 1,
              cutoutMaskPolarity: 'auto',
            })
          }
        >
          Reset look
        </Button>

        <Button disabled={disabled} size="sm" variant="secondary" onClick={onClearBackgroundMedia}>
          Reset background
        </Button>
      </div>

      <div className="make-cutout-foot">
        <span>
          Image: <strong>{draft.backgroundImageName || (backgroundImageUrl ? 'local object URL' : 'none')}</strong>
        </span>
        <span>
          Video: <strong>{draft.backgroundVideoName || (backgroundVideoUrl ? 'local object URL' : 'none')}</strong>
        </span>
        <span>
          Cutout model: <strong>{cutoutStatus}</strong>
        </span>
        <span>
          PiP: <strong>{draft.selectedMode === 'screen_pip' ? (draft.pipStyle === 'cutout' ? 'person cutout' : 'regular camera') : 'off'}</strong>
        </span>
      </div>
    </div>
  );
}
