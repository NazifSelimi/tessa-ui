/**
 * Post Studio video: turns the finished slides (or one post) into a short
 * Reel / Story clip in the browser. Free: the browser records a canvas with
 * MediaRecorder; nothing is uploaded.
 */

export type VideoMotion = 'zoom' | 'still';

export interface VideoOptions {
  width: number;
  height: number;
  secondsPerSlide: number;
  motion: VideoMotion;
  fps?: number;
  onProgress?: (done: number) => void;
  signal?: AbortSignal;
}

export interface VideoResult { blob: Blob; extension: 'mp4' | 'webm'; seconds: number }

export const FADE_SECONDS = 0.45;
const ZOOM_END = 1.07;
/** Reels and stories play best at 1080 wide; recording bigger only makes a heavier file. */
export const MAX_VIDEO_WIDTH = 1080;

/** MP4 where the browser can record it (Instagram and Facebook take it as is), else WebM. */
export function pickVideoType(isSupported: (type: string) => boolean = (type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)): { mimeType: string; extension: 'mp4' | 'webm' } | null {
  const candidates: [string, 'mp4' | 'webm'][] = [
    ['video/mp4;codecs=avc1.42E01E', 'mp4'],
    ['video/mp4', 'mp4'],
    ['video/webm;codecs=vp9', 'webm'],
    ['video/webm;codecs=vp8', 'webm'],
    ['video/webm', 'webm'],
  ];
  for (const [mimeType, extension] of candidates) {
    if (isSupported(mimeType)) return { mimeType, extension };
  }
  return null;
}

export const videoSeconds = (slides: number, secondsPerSlide: number) => Math.max(1, slides) * secondsPerSlide;

export interface FrameState {
  /** Slide on screen. */
  index: number;
  /** Slide fading in over it, or null. */
  next: number | null;
  /** 0..1 opacity of `next`. */
  blend: number;
  /** Scale of the slide on screen (and of `next`, which starts at 1). */
  zoom: number;
  nextZoom: number;
  /** 0..1 fade-in of the very first frame. */
  intro: number;
}

const ease = (t: number) => t * t * (3 - 2 * t);

/** What to draw at `time` seconds. Pure, so it can be tested without a browser. */
export function frameAt(time: number, slides: number, secondsPerSlide: number, motion: VideoMotion): FrameState {
  const count = Math.max(1, slides);
  const total = count * secondsPerSlide;
  const t = Math.min(Math.max(time, 0), total - 0.0001);
  const index = Math.min(count - 1, Math.floor(t / secondsPerSlide));
  const local = t - index * secondsPerSlide;
  const fade = Math.min(FADE_SECONDS, secondsPerSlide / 3);
  const zoomOf = (seconds: number) => (motion === 'zoom' ? 1 + (ZOOM_END - 1) * Math.min(1, seconds / secondsPerSlide) : 1);

  const fadingOut = index < count - 1 && local > secondsPerSlide - fade;
  const blend = fadingOut ? ease((local - (secondsPerSlide - fade)) / fade) : 0;

  return {
    index,
    next: fadingOut ? index + 1 : null,
    blend,
    zoom: zoomOf(local),
    nextZoom: 1,
    intro: index === 0 ? ease(Math.min(1, local / fade)) : 1,
  };
}

function drawSlide(context: CanvasRenderingContext2D, slide: CanvasImageSource, width: number, height: number, zoom: number, alpha: number) {
  if (alpha <= 0) return;
  const w = width * zoom;
  const h = height * zoom;
  context.globalAlpha = alpha;
  context.drawImage(slide, (width - w) / 2, (height - h) / 2, w, h);
  context.globalAlpha = 1;
}

export function drawFrame(context: CanvasRenderingContext2D, slides: CanvasImageSource[], state: FrameState, width: number, height: number) {
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  drawSlide(context, slides[state.index], width, height, state.zoom, state.intro);
  if (state.next !== null) drawSlide(context, slides[state.next], width, height, state.nextZoom, state.blend);
}

/**
 * Records the slides in real time (a 15 second video takes 15 seconds).
 * The tab must stay open and visible while it records.
 */
export function recordVideo(slides: HTMLCanvasElement[], options: VideoOptions): Promise<VideoResult> {
  const type = pickVideoType();
  if (!type || !slides.length || typeof HTMLCanvasElement.prototype.captureStream !== 'function') {
    return Promise.reject(new Error('This browser cannot record video. Try Chrome, Edge or Safari on a computer.'));
  }

  const fps = options.fps ?? 30;
  const scale = Math.min(1, MAX_VIDEO_WIDTH / options.width);
  // Video encoders need even sizes.
  const width = Math.round((options.width * scale) / 2) * 2;
  const height = Math.round((options.height * scale) / 2) * 2;
  const stage = document.createElement('canvas');
  stage.width = width;
  stage.height = height;
  const context = stage.getContext('2d');
  if (!context) return Promise.reject(new Error('The video could not be started.'));

  const seconds = videoSeconds(slides.length, options.secondsPerSlide);
  drawFrame(context, slides, frameAt(0, slides.length, options.secondsPerSlide, options.motion), width, height);

  return new Promise<VideoResult>((resolve, reject) => {
    const stream = stage.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType: type.mimeType, videoBitsPerSecond: 6_000_000 });
    const chunks: Blob[] = [];
    let frame = 0;
    let failed: Error | null = null;

    const stop = (error?: Error) => {
      if (error) failed = error;
      cancelAnimationFrame(frame);
      if (recorder.state !== 'inactive') recorder.stop();
    };

    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => stop(new Error('Recording failed. Please try again.'));
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      if (failed) return reject(failed);
      const blob = new Blob(chunks, { type: type.mimeType.split(';')[0] });
      if (!blob.size) return reject(new Error('The video came out empty. Please try again.'));
      resolve({ blob, extension: type.extension, seconds });
    };
    options.signal?.addEventListener('abort', () => stop(new Error('cancelled')), { once: true });

    recorder.start(250);
    const startedAt = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      drawFrame(context, slides, frameAt(elapsed, slides.length, options.secondsPerSlide, options.motion), width, height);
      options.onProgress?.(Math.min(1, elapsed / seconds));
      if (elapsed >= seconds) return stop();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  });
}
