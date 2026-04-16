import { useEffect, useMemo, useRef, useState } from 'react';
import type { Lecture } from '../types';

type Props = {
  lecture: Lecture;
  onExit: () => void;
};

const SEEK_SECONDS = 10;

export function VideoPlayer({ lecture, onExit }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const progress = useMemo(() => {
    if (!duration) return 0;
    return Math.min((current / duration) * 100, 100);
  }, [current, duration]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.playsInline = true;
    video.preload = 'metadata';

    const key = `watch:${lecture.id}`;
    const saved = Number(localStorage.getItem(key) ?? 0);

    const onLoadedMetadata = () => {
      setDuration(video.duration || 0);
      if (saved > 15 && saved < (video.duration || 0) - 10) {
        video.currentTime = saved;
      }
    };

    const onTimeUpdate = () => {
      setCurrent(video.currentTime || 0);
      localStorage.setItem(key, String(video.currentTime || 0));
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [lecture.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      if (event.key === ' ') {
        event.preventDefault();
        if (video.paused) {
          void video.play();
        } else {
          video.pause();
        }
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        video.currentTime = Math.min(video.currentTime + SEEK_SECONDS, video.duration || Infinity);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        video.currentTime = Math.max(video.currentTime - SEEK_SECONDS, 0);
      }
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        void toggleFullscreen();
      }
      if (event.key === 'Escape') {
        onExit();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const toggleFullscreen = async () => {
    const video = videoRef.current;
    if (!video) return;

    const anyVideo = video as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
    };

    if (!document.fullscreenElement) {
      try {
        await video.requestFullscreen();
      } catch {
        anyVideo.webkitEnterFullscreen?.();
      }
      return;
    }

    await document.exitFullscreen();
  };

  return (
    <section className="theater-shell" aria-label="Theater mode player">
      <header className="theater-topbar">
        <button type="button" className="ghost-btn" onClick={onExit}>
          Exit
        </button>
        <h1>{lecture.title}</h1>
        <button type="button" className="ghost-btn" onClick={() => void toggleFullscreen()}>
          {isFullscreen ? 'Window' : 'Fullscreen'}
        </button>
      </header>

      <div className="video-wrap">
        <video
          ref={videoRef}
          src={lecture.streamUrl}
          controls
          autoPlay
          controlsList="nodownload"
          disablePictureInPicture
          onClick={(event) => {
            const video = event.currentTarget;
            if (video.paused) {
              void video.play();
            } else {
              video.pause();
            }
          }}
        />
      </div>

      <footer className="theater-footer" aria-live="polite">
        <div className="timeline" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <p>
          {formatTime(current)} / {formatTime(duration)} · {isPlaying ? 'Playing' : 'Paused'}
        </p>
      </footer>
    </section>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value)) return '00:00';
  const minutes = Math.floor(value / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}
