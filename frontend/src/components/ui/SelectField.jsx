import { useEffect, useId, useState } from "react";
import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react";

const DEFAULT_STATUS_LABELS = {
  "initial-loading": "Đang tải tùy chọn...",
  refreshing: "Đang cập nhật tùy chọn...",
  empty: "Chưa có tùy chọn.",
  error: "Không tải được tùy chọn.",
};

function useDelayedBusy(isBusy, delayMs) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isBusy) {
      setVisible(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [delayMs, isBusy]);

  return visible;
}

export default function SelectField({
  label,
  options = [],
  state = "ready",
  statusLabels = {},
  error,
  onRetry,
  placeholder,
  className = "",
  selectClassName = "",
  id,
  "data-testid": testId,
  ...selectProps
}) {
  const generatedId = useId();
  const selectId = id || `select-field-${generatedId.replace(/:/g, "")}`;
  const statusId = `${selectId}-status`;
  const isBusy = state === "initial-loading" || state === "refreshing";
  const showBusy = useDelayedBusy(isBusy, 300);
  const hasOptions = options.length > 0;
  const hasPreservedValue = selectProps.value !== "" && selectProps.value != null;
  const isUnavailable =
    state === "initial-loading" ||
    (state === "empty" && !hasOptions) ||
    (state === "error" && !hasOptions && !hasPreservedValue);
  const disabled = Boolean(selectProps.disabled || isUnavailable);
  const mergedStatusLabels = { ...DEFAULT_STATUS_LABELS, ...statusLabels };
  const showStatus =
    (isBusy && showBusy) || state === "empty" || state === "error";
  const statusText =
    state === "error"
      ? error || mergedStatusLabels.error
      : mergedStatusLabels[state];

  return (
    <div
      className={`select-field ${className}`.trim()}
      data-state={state}
      data-testid={testId}
      aria-busy={isBusy}
    >
      <label className="select-field__label" htmlFor={selectId}>
        {label}
      </label>
      <div className="select-field__control">
        <select
          {...selectProps}
          id={selectId}
          className={`input select-field__select ${selectClassName}`.trim()}
          disabled={disabled}
          aria-describedby={showStatus ? statusId : selectProps["aria-describedby"]}
        >
          {placeholder ? (
            <option value={placeholder.value ?? ""}>{placeholder.label}</option>
          ) : null}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {isBusy && showBusy ? (
          <LoaderCircle
            className="select-field__spinner"
            size={18}
            aria-hidden="true"
          />
        ) : null}
      </div>
      {showStatus ? (
        <div
          className={`select-field__status select-field__status--${state}`}
          id={statusId}
        >
          {state === "error" ? (
            <AlertCircle size={16} aria-hidden="true" />
          ) : isBusy ? (
            <LoaderCircle
              className="select-field__status-spinner"
              size={16}
              aria-hidden="true"
            />
          ) : null}
          <span role="status" aria-live="polite">
            {statusText}
          </span>
          {state === "error" && onRetry ? (
            <button
              type="button"
              className="select-field__retry"
              onClick={onRetry}
              aria-label="Thử lại"
            >
              <RefreshCw size={15} aria-hidden="true" />
              <span>Thử lại</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
