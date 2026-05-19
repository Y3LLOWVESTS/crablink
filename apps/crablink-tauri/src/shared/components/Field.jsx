/**
 * RO:WHAT — Shared labeled field wrapper for CrabLink forms.
 * RO:WHY — App Integration; Concerns: DX; provides consistent labels, help text, errors, and layout.
 * RO:INTERACTS — TextInput, TextArea, FilePicker, route-local forms.
 * RO:INVARIANTS — presentational only; validation truth belongs to caller/backend contracts.
 * RO:METRICS — none.
 * RO:CONFIG — label/help/error/required/layout props.
 * RO:SECURITY — renders trusted React children only.
 * RO:TEST — visual/manual form smoke across local creator routes.
 */

import { useId } from 'react';

export default function Field({
  children,
  label = '',
  help = '',
  error = '',
  required = false,
  className = '',
  layout = 'stack',
  htmlFor = '',
}) {
  const generatedId = useId();
  const controlId = htmlFor || generatedId;
  const describedBy = error ? `${controlId}-error` : help ? `${controlId}-help` : undefined;

  return (
    <label
      className={[
        'cl-field',
        `cl-field-${layout}`,
        error ? 'has-error' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      htmlFor={controlId}
    >
      {label && (
        <span className="cl-field-label">
          {label}
          {required && <em aria-hidden="true">*</em>}
        </span>
      )}

      <span className="cl-field-control">
        {injectFieldProps(children, {
          id: controlId,
          'aria-describedby': describedBy,
          'aria-invalid': error ? 'true' : undefined,
          required,
        })}
      </span>

      {help && !error && (
        <span className="cl-field-help" id={`${controlId}-help`}>
          {help}
        </span>
      )}

      {error && (
        <span className="cl-field-error" id={`${controlId}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}

function injectFieldProps(children, props) {
  if (!children || typeof children !== 'object') {
    return children;
  }

  if (Array.isArray(children)) {
    return children;
  }

  if (!children.props) {
    return children;
  }

  const nextProps = {};

  if (!children.props.id) {
    nextProps.id = props.id;
  }

  if (props['aria-describedby'] && !children.props['aria-describedby']) {
    nextProps['aria-describedby'] = props['aria-describedby'];
  }

  if (props['aria-invalid'] && !children.props['aria-invalid']) {
    nextProps['aria-invalid'] = props['aria-invalid'];
  }

  if (props.required && children.props.required === undefined) {
    nextProps.required = true;
  }

  return {
    ...children,
    props: {
      ...children.props,
      ...nextProps,
    },
  };
}