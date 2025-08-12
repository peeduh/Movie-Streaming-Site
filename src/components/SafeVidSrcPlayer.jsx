// src/components/SafeVidSrcPlayer.jsx
export default function SafeVidSrcPlayer({ imdbId, onClose }) {
  if (!imdbId) return null;
  const src = `https://vidsrc.net/embed/${imdbId}`;

  return (
    <div className="relative w-full mb-4">
      {/* 16:9 area */}
      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
        <iframe
          src={src}
          title="VidSrc Player"
          loading="lazy"
          // allow *no* popups or top-navigation
          allow="autoplay; fullscreen; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full rounded-xl shadow-lg"
        />
      </div>

      {onClose && (
        <div className="mt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-md"
          >
            Close player
          </button>
        </div>
      )}
    </div>
  );
}
