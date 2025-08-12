// src/components/SafeVidSrcPlayer.jsx
import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

/**
 * Modes:
 * - "relaxed" (default): sandbox without popups, but allows top-navigation by user activation.
 * - "none": no sandbox at all (maximum compatibility, popups possible).
 * - "strict": original strict sandbox (might trigger vidsrc's sbx.html redirect).
 *
 * Overlay click shield:
 * - Captures clicks so they don't reach the iframe (and can't spawn popups).
 * - "Unlock controls" temporarily disables the shield for N seconds.
 */
export default function SafeVidSrcPlayer({
  imdbId,
  mode = "relaxed",
  useClickShield = true,
  unlockSeconds = 8,
  onClose,
}) {
  const [shieldActive, setShieldActive] = useState(useClickShield);
  const timerRef = useRef(null);

  if (!imdbId) return null;
  const src = `https://vidsrc.net/embed/${imdbId}`;

  // Compose sandbox per mode
  const sandbox =
    mode === "none"
      ? undefined
      : mode === "strict"
      ? // strict sandbox (original)
        "allow-scripts allow-same-origin allow-forms allow-presentation"
      : // relaxed: add top-navigation-by-user-activation (NO popups)
        "allow-scripts allow-same-origin allow-forms allow-presentation allow-top-navigation-by-user-activation";

  // Allow list – do NOT include "popups" or "popups-to-escape-sandbox"
  const allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const unlockTemporarily = () => {
    setShieldActive(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShieldActive(true), unlockSeconds * 1000);
  };

  return (
    <div className="relative w-full mb-4">
      {/* 16:9 area */}
      <div className="relative w-full rounded-xl shadow-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <iframe
          src={src}
          title="VidSrc Player"
          loading="lazy"
          allow={allow}
          // Remove referrerPolicy to mimic your successful manual test
          // referrerPolicy="no-referrer"
          {...(sandbox ? { sandbox } : {})}
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: shieldActive ? "none" : "auto" }}
        />

        {/* Click shield + controls */}
        {useClickShield && (
          <div
            className="absolute inset-0"
            style={{
              pointerEvents: "auto",
              // transparent shield layer
              background: "transparent",
            }}
          >
            {shieldActive ? (
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  onClick={unlockTemporarily}
                  className="px-3 py-1.5 text-xs sm:text-sm bg-gray-900/70 hover:bg-gray-900/80 text-white rounded-md backdrop-blur border border-white/10"
                  title={`Temporarily enable controls for ${unlockSeconds}s`}
                >
                  Unlock controls ({unlockSeconds}s)
                </button>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 text-xs sm:text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-md"
                  >
                    Close
                  </button>
                )}
              </div>
            ) : (
              <div className="absolute top-2 right-3">
                <button
                  onClick={() => setShieldActive(true)}
                  className="px-3 py-1.5 text-xs sm:text-sm bg-gray-900/70 hover:bg-gray-900/80 text-white rounded-md backdrop-blur border border-white/10"
                >
                  Re-lock
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mode switch helper (optional UI – remove if you don’t want users to see it) */}
      {/* <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
        <span>Mode:</span>
        <span className="font-semibold">{mode}</span>
      </div> */}
    </div>
  );
}

SafeVidSrcPlayer.propTypes = {
  imdbId: PropTypes.string,
  mode: PropTypes.oneOf(["relaxed", "none", "strict"]),
  useClickShield: PropTypes.bool,
  unlockSeconds: PropTypes.number,
  onClose: PropTypes.func,
};
