/**
 * RO:WHAT — Local look/effects controls for CrabLink stream compositor.
 * RO:WHY — Adds background replacement, uploaded local backgrounds, chroma key, and person cutout without touching backend, wallet, receipt, or stream truth.
 * RO:INTERACTS — StreamPage, streamCompositor, streamPersonSegmentation, streamStudioModel, stream.css.
 * RO:INVARIANTS — local compositor preferences only; no wallet state, receipt state, entitlement, backend session, or stream ownership truth.
 * RO:SECURITY — uploaded background images remain local draft state; no local path exposure, no arbitrary code, no secrets.
 * RO:TEST — npm run build; camera preview → Person cutout → solid background/image background smoke.
 */

import { useEffect, useRef, useState } from 'react';
import { getPersonSegmentationStatus } from './streamPersonSegmentation.js';

const BACKGROUND_PRESETS = Object.freeze([
  { id: 'none', label: 'None', color: '' },
  { id: 'solid_black', label: 'Black', color: '#050505' },
  { id: 'solid_green', label: 'Green', color: '#052e16' },
  { id: 'solid_blue', label: 'Blue', color: '#071d3a' },
  { id: 'solid_purple', label: 'Purple', color: '#2e1065' },
]);

export default function StreamLookPanel({ draft, onChange }) {
  const fileInputRef = useRef(null);
  const [fileError, setFileError] = useState('');
  const [segmentationStatus, setSegmentationStatus] = useState(() => getPersonSegmentationStatus());

  const backgroundMode = draft.backgroundMode || 'none';
  const backgroundSolidColor = draft.backgroundSolidColor || '#111111';
  const backgroundRemovalMode = draft.backgroundRemovalMode || 'none';
  const greenScreenEnabled = draft.greenScreenEnabled === true || draft.greenScreenEnabled === 'on';
  const keyColor = draft.greenScreenKeyColor || '#00ff00';
  const tolerance = clampNumber(draft.greenScreenTolerance, 34, 0, 100);
  const feather = clampNumber(draft.greenScreenFeather, 8, 0, 100);
  const spill = clampNumber(draft.greenScreenSpillReduction, 10, 0, 100);
  const personMaskFeather = clampNumber(draft.personMaskFeather, 2, 0, 12);
  const cameraBrightness = clampNumber(draft.cameraBrightness, 100, 70, 140);
  const cameraContrast = clampNumber(draft.cameraContrast, 100, 70, 150);
  const cameraSaturation = clampNumber(draft.cameraSaturation, 100, 50, 160);
  const personMaskFlip =
    draft.personMaskFlip === true ||
    draft.personMaskPolarity === 'flip' ||
    draft.personMaskPolarity === 'keep_not_value';

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSegmentationStatus(getPersonSegmentationStatus());
    }, 350);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  function patch(next) {
    onChange?.({
      ...draft,
      ...next,
    });
  }

  function applyBackgroundPreset(preset) {
    if (preset.id === 'none') {
      patch({
        backgroundMode: 'none',
        backgroundImageDataUrl: '',
        backgroundImageName: '',
      });
      return;
    }

    patch({
      backgroundMode: 'solid',
      backgroundSolidColor: preset.color,
      backgroundImageDataUrl: '',
      backgroundImageName: '',
    });
  }

  function setRemovalMode(mode) {
    if (mode === 'person') {
      patch({
        backgroundRemovalMode: 'person',
        personSegmentationEnabled: true,
        personMaskPolarity: 'auto',
        personMaskFlip: false,
        personMaskInvert: false,
        greenScreenEnabled: false,
        sourceMode: 'local_camera_preview',
        ingestMode: 'stream_lite_compositor_future',
      });
      return;
    }

    if (mode === 'chroma') {
      patch({
        backgroundRemovalMode: 'chroma',
        personSegmentationEnabled: false,
        personMaskPolarity: 'auto',
        personMaskFlip: false,
        personMaskInvert: false,
        greenScreenEnabled: true,
        sourceMode: 'camera_green_screen_background_future',
        ingestMode: 'stream_lite_compositor_future',
      });
      return;
    }

    patch({
      backgroundRemovalMode: 'none',
      personSegmentationEnabled: false,
      personMaskPolarity: 'auto',
      personMaskFlip: false,
      personMaskInvert: false,
      greenScreenEnabled: false,
    });
  }

  function chooseBackgroundImage() {
    fileInputRef.current?.click();
  }

  function clearBackgroundImage() {
    patch({
      backgroundMode: 'none',
      backgroundImageDataUrl: '',
      backgroundImageName: '',
    });
  }

  async function onBackgroundImageSelected(event) {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    setFileError('');

    if (!file) {
      return;
    }

    if (!String(file.type || '').startsWith('image/')) {
      setFileError('Choose an image file for the local background.');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setFileError('Choose a background image under 4 MB for the stream compositor MVP.');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);

      patch({
        backgroundMode: 'image',
        backgroundImageDataUrl: dataUrl,
        backgroundImageName: safeFileName(file.name),
        backgroundImageFit: draft.backgroundImageFit || 'cover',
      });
    } catch (_error) {
      setFileError('Unable to read the selected background image.');
    }
  }

  return (
    <section className="cl-stream-panel cl-stream-look-panel" aria-label="Stream look controls">
      <div className="cl-stream-look-head">
        <div>
          <p className="cl-eyebrow">Look</p>
          <h3>Background replacement</h3>
          <p>
            Use Person cutout for TikTok/Zoom-style background removal. Chroma key still exists for
            real green screens.
          </p>
        </div>

        <span className={backgroundRemovalMode !== 'none' ? 'is-on' : ''}>
          {labelRemovalMode(backgroundRemovalMode)}
        </span>
      </div>

      <div className="cl-stream-removal-toggle" role="group" aria-label="Background removal mode">
        <button
          type="button"
          className={backgroundRemovalMode === 'none' ? 'is-active' : ''}
          onClick={() => setRemovalMode('none')}
        >
          No cutout
        </button>
        <button
          type="button"
          className={backgroundRemovalMode === 'person' ? 'is-active' : ''}
          onClick={() => setRemovalMode('person')}
        >
          Person cutout
        </button>
        <button
          type="button"
          className={backgroundRemovalMode === 'chroma' ? 'is-active' : ''}
          onClick={() => setRemovalMode('chroma')}
        >
          Chroma key
        </button>
      </div>

      <div className="cl-stream-look-presets" role="group" aria-label="Background presets">
        {BACKGROUND_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={
              (preset.id === 'none' && backgroundMode === 'none') ||
              (preset.color && backgroundMode === 'solid' && backgroundSolidColor === preset.color)
                ? 'is-active'
                : ''
            }
            onClick={() => applyBackgroundPreset(preset)}
          >
            {preset.color ? <i style={{ background: preset.color }} aria-hidden="true" /> : null}
            {preset.label}
          </button>
        ))}
      </div>

      <div className="cl-stream-background-image-row">
        <button type="button" onClick={chooseBackgroundImage}>
          Open background image
        </button>
        <button type="button" onClick={clearBackgroundImage} disabled={backgroundMode !== 'image'}>
          Clear image
        </button>
        <span>
          {backgroundMode === 'image'
            ? draft.backgroundImageName || 'Local background image loaded'
            : 'Solid/background presets are local only'}
        </span>
      </div>

      <input
        ref={fileInputRef}
        className="cl-stream-hidden-file-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/*"
        onChange={onBackgroundImageSelected}
        aria-hidden="true"
        tabIndex={-1}
      />

      {fileError ? (
        <p className="cl-stream-error" role="alert">
          {fileError}
        </p>
      ) : null}

      <div className="cl-stream-look-grid">
        <label className="cl-stream-look-field">
          <span>Background color</span>
          <input
            type="color"
            value={backgroundSolidColor}
            onChange={(event) =>
              patch({
                backgroundMode: 'solid',
                backgroundSolidColor: event.target.value,
                backgroundImageDataUrl: '',
                backgroundImageName: '',
              })
            }
          />
        </label>

        <label className="cl-stream-look-field">
          <span>Image fit</span>
          <select
            value={draft.backgroundImageFit || 'cover'}
            onChange={(event) =>
              patch({
                backgroundImageFit: event.target.value,
              })
            }
            disabled={backgroundMode !== 'image'}
          >
            <option value="cover">Cover stage</option>
            <option value="contain">Contain image</option>
          </select>
        </label>
      </div>

      {backgroundRemovalMode === 'person' ? (
        <>
          <div className="cl-stream-segmentation-status">
            <span>Person model</span>
            <strong>{labelSegmentationStatus(segmentationStatus.status)}</strong>
            <small>
              Labels: {segmentationStatus.labels?.join(', ') || 'loading'} · subject value:{' '}
              {segmentationStatus.personValue ?? 'auto'} · source:{' '}
              {segmentationStatus.personValueSource || 'auto'} · mask:{' '}
              {segmentationStatus.hasMask
                ? `${segmentationStatus.maskWidth}×${segmentationStatus.maskHeight}`
                : 'none'}
            </small>
          </div>

          <label className="cl-stream-look-toggle">
            <input
              type="checkbox"
              checked={personMaskFlip}
              onChange={(event) =>
                patch({
                  personMaskFlip: event.target.checked,
                  personMaskPolarity: event.target.checked ? 'flip' : 'auto',
                  personMaskInvert: false,
                })
              }
            />
            <span>Flip cutout polarity</span>
          </label>

          <div className="cl-stream-look-grid">
            <label className="cl-stream-look-range">
              <span>Cutout edge softness · {personMaskFeather}</span>
              <input
                type="range"
                min="0"
                max="12"
                value={personMaskFeather}
                onChange={(event) =>
                  patch({
                    personMaskFeather: Number(event.target.value),
                  })
                }
              />
            </label>

            <label className="cl-stream-look-range">
              <span>Brightness · {cameraBrightness}%</span>
              <input
                type="range"
                min="70"
                max="140"
                value={cameraBrightness}
                onChange={(event) =>
                  patch({
                    cameraBrightness: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>

          <div className="cl-stream-look-grid">
            <label className="cl-stream-look-range">
              <span>Contrast · {cameraContrast}%</span>
              <input
                type="range"
                min="70"
                max="150"
                value={cameraContrast}
                onChange={(event) =>
                  patch({
                    cameraContrast: Number(event.target.value),
                  })
                }
              />
            </label>

            <label className="cl-stream-look-range">
              <span>Saturation · {cameraSaturation}%</span>
              <input
                type="range"
                min="50"
                max="160"
                value={cameraSaturation}
                onChange={(event) =>
                  patch({
                    cameraSaturation: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
        </>
      ) : null}

      {backgroundRemovalMode === 'chroma' ? (
        <>
          <div className="cl-stream-look-grid">
            <label className="cl-stream-look-field">
              <span>Key color</span>
              <input
                type="color"
                value={keyColor}
                onChange={(event) =>
                  patch({
                    greenScreenKeyColor: event.target.value,
                  })
                }
              />
            </label>

            <label className="cl-stream-look-toggle">
              <input
                type="checkbox"
                checked={greenScreenEnabled}
                onChange={(event) =>
                  patch({
                    greenScreenEnabled: event.target.checked,
                    backgroundRemovalMode: event.target.checked ? 'chroma' : 'none',
                    sourceMode: event.target.checked
                      ? 'camera_green_screen_background_future'
                      : draft.sourceMode,
                    ingestMode: event.target.checked
                      ? 'stream_lite_compositor_future'
                      : draft.ingestMode,
                  })
                }
              />
              <span>Enable chroma key</span>
            </label>
          </div>

          <div className="cl-stream-look-grid">
            <label className="cl-stream-look-range">
              <span>Tolerance · {tolerance}</span>
              <input
                type="range"
                min="0"
                max="100"
                value={tolerance}
                onChange={(event) =>
                  patch({
                    greenScreenTolerance: Number(event.target.value),
                  })
                }
              />
            </label>

            <label className="cl-stream-look-range">
              <span>Feather · {feather}</span>
              <input
                type="range"
                min="0"
                max="100"
                value={feather}
                onChange={(event) =>
                  patch({
                    greenScreenFeather: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>

          <label className="cl-stream-look-range">
            <span>Spill reduction · {spill}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={spill}
              onChange={(event) =>
                patch({
                  greenScreenSpillReduction: Number(event.target.value),
                })
              }
            />
          </label>
        </>
      ) : null}

      <p className="cl-stream-look-note">
        Person cutout, chroma key, and background images are local compositor effects. They do not
        create b3 assets, receipts, wallet events, entitlements, or backend stream truth.
      </p>
    </section>
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('File read failed.'));
    reader.readAsDataURL(file);
  });
}

function safeFileName(name) {
  return String(name || 'background image')
    .replace(/[^\w .()\-]/g, '')
    .trim()
    .slice(0, 90);
}

function labelRemovalMode(value) {
  if (value === 'person') return 'Person cutout';
  if (value === 'chroma') return 'Chroma key';
  return 'No cutout';
}

function labelSegmentationStatus(value) {
  if (value === 'ready') return 'Ready';
  if (value === 'loading') return 'Loading model';
  if (value === 'waiting_for_video') return 'Waiting for camera';
  if (value === 'error') return 'Unavailable';
  return 'Idle';
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  const safe = Number.isFinite(parsed) ? parsed : fallback;

  return Math.max(min, Math.min(max, safe));
}