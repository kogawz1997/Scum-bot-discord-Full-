import React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

function joinClassNames(...values) {
  return values.filter(Boolean).join(" ");
}

export function Select({
  id,
  value,
  options,
  onValueChange,
  className = "",
  placeholder = "Select option",
  disabled = false,
}) {
  const triggerRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0 });

  const normalizedOptions = React.useMemo(
    () =>
      (options || []).map((option) =>
        typeof option === "string"
          ? { value: option, label: option }
          : {
              value: option.value,
              label: option.label ?? option.value,
              disabled: Boolean(option.disabled),
            }
      ),
    [options]
  );

  const selectedOption = normalizedOptions.find((option) => option.value === value) || null;

  const syncPosition = React.useCallback(() => {
    const node = triggerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  React.useEffect(() => {
    if (!open) return undefined;

    syncPosition();

    function handlePointerDown(event) {
      const target = event.target;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handleViewportChange() {
      syncPosition();
    }

    function handleScroll(event) {
      const target = event.target;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, syncPosition]);

  function handleToggle() {
    if (disabled) return;
    if (!open) syncPosition();
    setOpen((current) => !current);
  }

  function handleSelect(nextValue) {
    onValueChange?.(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={handleToggle}
        className={joinClassNames(
          "owner-input flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2 text-left text-sm text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        <span className={selectedOption ? "truncate text-white" : "truncate text-zinc-500"}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={joinClassNames("h-4 w-4 shrink-0 text-zinc-500 transition-transform", open ? "rotate-180 text-cyan-300" : "")} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[140] overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#0b1220]/95 shadow-[0_24px_80px_rgba(2,6,23,0.7)] backdrop-blur-xl"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
          >
            <div className="max-h-72 overflow-auto p-1.5">
              {normalizedOptions.map((option) => {
                const selected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    className={joinClassNames(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      option.disabled
                        ? "cursor-not-allowed opacity-50"
                        : selected
                          ? "bg-cyan-400/16 text-cyan-100"
                          : "text-zinc-200 hover:bg-white/[0.05]"
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {selected ? <Check className="h-4 w-4 shrink-0 text-cyan-300" /> : null}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
