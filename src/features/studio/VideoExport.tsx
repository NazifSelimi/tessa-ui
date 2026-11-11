/**
 * "Make video" for Post Studio: a short Reel / Story clip from the slides of
 * the post (or the single post), recorded in the browser.
 */
import { useRef, useState } from 'react';
import { Alert, App, Button, Modal, Progress, Segmented, Space, Typography } from 'antd';
import { DownloadOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { pickVideoType, recordVideo, videoSeconds, type VideoMotion, type VideoResult } from './video';

const { Paragraph, Text } = Typography;

interface VideoExportProps {
  /** Renders every slide at full size, in order. */
  renderSlides: () => Promise<HTMLCanvasElement[]>;
  slideCount: number;
  width: number;
  height: number;
  /** File name without extension. */
  fileBase: string;
}

export default function VideoExport({ renderSlides, slideCount, width, height, fileBase }: VideoExportProps) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [seconds, setSeconds] = useState(4);
  const [motion, setMotion] = useState<VideoMotion>('zoom');
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<(VideoResult & { url: string }) | null>(null);
  const abort = useRef<AbortController | null>(null);

  const supported = pickVideoType();
  const count = Math.max(1, slideCount);
  const total = videoSeconds(count, seconds);
  const vertical = height / width > 1.6;

  const clear = () => {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
  };

  const make = async () => {
    clear();
    setProgress(0);
    abort.current = new AbortController();
    try {
      const slides = await renderSlides();
      const video = await recordVideo(slides, { width, height, secondsPerSlide: seconds, motion, onProgress: setProgress, signal: abort.current.signal });
      setResult({ ...video, url: URL.createObjectURL(video.blob) });
    } catch (error) {
      if (!(error instanceof Error && error.message === 'cancelled')) {
        message.error(error instanceof Error ? error.message : 'The video could not be made.');
      }
    } finally {
      setProgress(null);
    }
  };

  const close = () => {
    abort.current?.abort();
    clear();
    setOpen(false);
  };

  const save = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.url;
    link.download = `${fileBase}.${result.extension}`;
    link.click();
  };

  return (
    <>
      <Button icon={<VideoCameraOutlined />} onClick={() => setOpen(true)}>Video</Button>
      <Modal title="Make a video (Reel / Story)" open={open} onCancel={close} footer={null} destroyOnHidden width={460}>
        {!supported ? (
          <Alert type="warning" showIcon message="This browser cannot record video" description="Open Post Studio in Chrome, Edge or Safari on a computer." />
        ) : (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {count > 1 ? `Your ${count} slides play one after another with a soft fade.` : 'Your post becomes a short clip. Add slides (carousel) for a longer video.'}
            </Paragraph>
            {!vertical && <Alert type="info" showIcon message="Reels and stories are tall (9:16)" description="Switch the size to Story for a full-screen video. This size still works as a feed video." />}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Seconds per slide</Text>
              <Segmented value={seconds} onChange={(value) => setSeconds(Number(value))} options={[3, 4, 5, 6, 8].map((value) => ({ value, label: `${value} s` }))} disabled={progress !== null} />
            </div>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Movement</Text>
              <Segmented value={motion} onChange={(value) => setMotion(value as VideoMotion)} options={[{ value: 'zoom', label: 'Slow zoom' }, { value: 'still', label: 'Still' }]} disabled={progress !== null} />
            </div>

            {progress !== null ? (
              <div>
                <Progress percent={Math.round(progress * 100)} status="active" />
                <Text type="secondary">Recording {total} seconds… keep this tab open and in front.</Text>
              </div>
            ) : (
              <Button type="primary" icon={<VideoCameraOutlined />} onClick={make} block>
                {result ? 'Make it again' : `Make ${total}-second video`}
              </Button>
            )}

            {result && (
              <div>
                <video src={result.url} controls loop muted playsInline style={{ width: '100%', maxHeight: 360, background: '#000', borderRadius: 8 }} />
                <Button type="primary" icon={<DownloadOutlined />} onClick={save} block style={{ marginTop: 10 }}>
                  Download video (.{result.extension}, {(result.blob.size / 1024 / 1024).toFixed(1)} MB)
                </Button>
                {result.extension === 'webm' && (
                  <Alert style={{ marginTop: 10 }} type="info" showIcon message="This browser saved a .webm file" description="Instagram needs .mp4. Make the video in Safari or a recent Chrome / Edge to get .mp4 directly." />
                )}
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>The video has no sound: add music in Instagram or Facebook when you post it.</Text>
              </div>
            )}
          </Space>
        )}
      </Modal>
    </>
  );
}
