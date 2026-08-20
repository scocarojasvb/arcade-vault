"use client";

import { useEffect, useRef, useState } from "react";

export type TouchControlCode = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Space";

const REPEAT_DELAY_MS = 500;
const REPEAT_INTERVAL_MS = 80;

function dispatchKey(type: "keydown" | "keyup", code: TouchControlCode) {
  window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
}

function usePressableCode(code: TouchControlCode, repeat: boolean) {
  const [active, setActive] = useState(false);
  const pointerIdRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const release = () => {
    if (pointerIdRef.current === null) return;
    pointerIdRef.current = null;
    clearTimers();
    setActive(false);
    dispatchKey("keyup", code);
  };

  const press = (pointerId: number) => {
    if (pointerIdRef.current !== null) return;
    pointerIdRef.current = pointerId;
    setActive(true);
    dispatchKey("keydown", code);
    if (repeat) {
      timeoutRef.current = window.setTimeout(() => {
        intervalRef.current = window.setInterval(
          () => dispatchKey("keydown", code),
          REPEAT_INTERVAL_MS,
        );
      }, REPEAT_DELAY_MS);
    }
  };

  useEffect(() => {
    const onWindowPointerEnd = (e: PointerEvent) => {
      if (pointerIdRef.current === e.pointerId) release();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") release();
    };
    window.addEventListener("pointerup", onWindowPointerEnd);
    window.addEventListener("pointercancel", onWindowPointerEnd);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pointerup", onWindowPointerEnd);
      window.removeEventListener("pointercancel", onWindowPointerEnd);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    active,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        press(e.pointerId);
      },
      onPointerUp: (e: React.PointerEvent) => {
        if (pointerIdRef.current === e.pointerId) release();
      },
      onPointerCancel: (e: React.PointerEvent) => {
        if (pointerIdRef.current === e.pointerId) release();
      },
      onPointerLeave: (e: React.PointerEvent) => {
        if (pointerIdRef.current === e.pointerId) release();
      },
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}

function DpadButton({
  code,
  label,
  area,
}: {
  code: TouchControlCode;
  label: string;
  area: string;
}) {
  const { active, handlers } = usePressableCode(code, true);
  return (
    <button
      type="button"
      className={`touch-controls-btn touch-controls-dpad-btn${active ? " is-active" : ""}`}
      style={{ gridArea: area }}
      aria-label={code}
      {...handlers}
    >
      {label}
    </button>
  );
}

export default function TouchControls() {
  const actionButton = usePressableCode("Space", false);

  return (
    <div className="touch-controls">
      <div className="touch-controls-dpad">
        <DpadButton code="ArrowUp" label="▲" area="up" />
        <DpadButton code="ArrowLeft" label="◀" area="left" />
        <DpadButton code="ArrowRight" label="▶" area="right" />
        <DpadButton code="ArrowDown" label="▼" area="down" />
      </div>
      <button
        type="button"
        className={`touch-controls-btn touch-controls-action-btn${actionButton.active ? " is-active" : ""}`}
        aria-label="Space"
        {...actionButton.handlers}
      >
        ●
      </button>
    </div>
  );
}
