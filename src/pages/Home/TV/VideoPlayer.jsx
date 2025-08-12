import { useEffect, useRef, memo } from 'react';
import PropTypes from 'prop-types';

const VideoPlayer = ({ tvId, season = 1, episode = 1 }) => {
  const iframeRef = useRef(null);

  useEffect(() => {
    // Disable window.open
    window.open = () => null;

    const handleContextMenu = (event) => event.preventDefault();

    const handleWindowBlur = () => {
      if (document.activeElement instanceof HTMLIFrameElement) {
        window.focus();
      }
    };

    const preventIframeRedirects = () => {
      try {
        if (iframeRef.current?.contentWindow) {
          Object.defineProperties(iframeRef.current.contentWindow, {
            location: {
              get() {
                return null;
              },
              set() {},
              configurable: true,
            },
          });
        }
      } catch (error) {
        console.warn(
          'Unable to modify iframe due to cross-origin restrictions.' + error
        );
      }
    };

    const iframeElement = iframeRef.current;
    iframeElement?.addEventListener('load', preventIframeRedirects);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('blur', handleWindowBlur);

    const currentIframeRef = iframeRef.current;

    currentIframeRef?.removeEventListener('load', preventIframeRedirects);
    iframeElement?.removeEventListener('load', preventIframeRedirects);
    iframeRef.current?.removeEventListener('load', preventIframeRedirects);
    window.removeEventListener('contextmenu', handleContextMenu);
    window.removeEventListener('blur', handleWindowBlur);
  }, []);

  const iframeSrc = `https://vidsrc.net/embed/tv/${tvId}/${season}/${episode}`;

  return (
    <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        allowFullScreen
        title="Series Stream"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        referrerPolicy="no-referrer"
        className="absolute top-0 left-0   w-full h-[50vh] sm:h-[30vh] md:h-[60vh] lg:h-[70vh] xl:h-[80vh] rounded shadow-lg mb-3"
        style={{
          pointerEvents: 'auto',
          userSelect: 'none',
        }}
      />
    </div>
  );
};

VideoPlayer.propTypes = {
  tvId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  season: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  episode: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default memo(VideoPlayer);
