import * as React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string; label: string }[];
  allowCustom?: boolean;
  customOptionLabel?: string;
  customInputLabel?: string;
  customInputPlaceholder?: string;
  onCustomValueChange?: (value: string) => void;
}

export const CUSTOM_OPTION_VALUE = "__CUSTOM__";

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className = "",
      label,
      error,
      options,
      children,
      id,
      allowCustom = false,
      customOptionLabel = "Custom / Other",
      customInputLabel = "Enter custom value",
      customInputPlaceholder = "Type custom value...",
      onCustomValueChange,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;
    const customInputId = `${selectId}-custom`;

    // 1. Collect all standard option values
    const standardValues = React.useMemo(() => {
      const set = new Set<string>();
      if (options) {
        options.forEach((opt) => set.add(opt.value));
      }
      if (children) {
        React.Children.forEach(children, (child) => {
          if (React.isValidElement(child) && child.props.value !== undefined) {
            set.add(String(child.props.value));
          }
        });
      }
      return set;
    }, [options, children]);

    // 2. Check if current value represents a custom selection
    // A value is custom if:
    // - it equals the sentinel CUSTOM_OPTION_VALUE, OR
    // - it is non-empty and not part of the standard options (e.g. restoring pre-existing custom record)
    const isValueNonStandard = Boolean(
      allowCustom &&
        value !== undefined &&
        value !== "" &&
        value !== null &&
        !standardValues.has(String(value))
    );

    const [isCustomMode, setIsCustomMode] = React.useState(isValueNonStandard);
    const [customText, setCustomText] = React.useState(
      isValueNonStandard && value !== CUSTOM_OPTION_VALUE ? String(value) : ""
    );

    // Keep internal custom state synchronized if controlled parent changes value
    React.useEffect(() => {
      if (allowCustom) {
        if (value !== undefined && value !== "" && value !== null && !standardValues.has(String(value))) {
          setIsCustomMode(true);
          if (value !== CUSTOM_OPTION_VALUE) {
            setCustomText(String(value));
          }
        } else if (value !== undefined && standardValues.has(String(value))) {
          setIsCustomMode(false);
        }
      }
    }, [value, standardValues, allowCustom]);

    // Handle dropdown selection change
    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selected = e.target.value;
      if (allowCustom && selected === CUSTOM_OPTION_VALUE) {
        setIsCustomMode(true);
        // Dispatch synthetic event with existing customText or empty
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: customText.trim(),
            name: props.name || "",
          },
        } as React.ChangeEvent<HTMLSelectElement>;

        onChange?.(syntheticEvent);
        onCustomValueChange?.(customText.trim());
      } else {
        setIsCustomMode(false);
        setCustomText("");
        onChange?.(e);
      }
    };

    // Handle custom text input typing
    const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newText = e.target.value;
      setCustomText(newText);

      // Dispatch synthetic event to parent onChange
      if (onChange) {
        const syntheticEvent = {
          target: {
            value: newText,
            name: props.name || "",
          },
        } as any;
        onChange(syntheticEvent);
      }

      onCustomValueChange?.(newText);
    };

    // Determine value to display in <select> element
    const displayedSelectValue = isCustomMode
      ? CUSTOM_OPTION_VALUE
      : value !== undefined
      ? value
      : undefined;

    const customValidationError =
      isCustomMode && props.required && !customText.trim()
        ? "Please enter a custom value."
        : error;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            {label} {props.required && <span className="text-rose-500">*</span>}
          </label>
        )}

        <select
          id={selectId}
          ref={ref}
          value={displayedSelectValue}
          onChange={handleSelectChange}
          className={`flex h-9 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs md:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${
            customValidationError ? "border-rose-500 focus:ring-rose-500" : ""
          } ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}

          {allowCustom && (
            <option value={CUSTOM_OPTION_VALUE}>
              {customOptionLabel}
            </option>
          )}
        </select>

        {/* Custom text input revealed when Custom / Other is chosen */}
        {allowCustom && isCustomMode && (
          <div className="pt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <label
              htmlFor={customInputId}
              className="block text-[11px] font-medium text-sky-700 dark:text-sky-300 mb-1"
            >
              {customInputLabel} {props.required && <span className="text-rose-500">*</span>}
            </label>
            <div className="relative">
              <input
                id={customInputId}
                type="text"
                required={props.required}
                value={customText}
                onChange={handleCustomInputChange}
                placeholder={customInputPlaceholder}
                className={`flex h-8.5 w-full rounded-lg border border-sky-300 dark:border-sky-700 bg-sky-50/40 dark:bg-sky-950/20 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all ${
                  !customText.trim() && props.required ? "border-rose-400 focus:ring-rose-500" : ""
                }`}
              />
            </div>
            {!customText.trim() && props.required && (
              <p className="text-[10px] text-rose-500 font-medium mt-0.5">Custom value cannot be empty.</p>
            )}
          </div>
        )}

        {customValidationError && !isCustomMode && (
          <p className="text-xs text-rose-500 font-medium">{customValidationError}</p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
