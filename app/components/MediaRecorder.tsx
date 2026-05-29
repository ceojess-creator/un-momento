'use client';
import { useEffect, useRef, useState } from 'react';

const MAX_SECONDS = 60;

type RecordingState = 'idle' | 'countdown' | 'recording' | 'preview' | 'done';
type MediaMode      = 'video' | 'audio';

interface MediaRecorderProps {
  onComplete: (file: File, type: 'video' | 'audio') => void;
  onSkip:     () => void;
}

export default function MemoryRecorder({
  onComplete,
  onSkip,
}: MediaRecorderProps) {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const previewRef    = useRef<HTMLVideoElement>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const recorderRef   = useRef<MediaRecorder | null>(null);
  const chunksRef     = useRef<Blob[]>([]);
  const timerRef      = useRef<NodeJS.Timeout | null>(null);

  const [mode,        setMode]        = useState<MediaMode>('video');
  const [recordState, setRecordState] = useState<RecordingState>('idle');
  const [countdown,   setCountdown]   = useState(3);
  const [elapsed,     setElapsed]     = useState(0);
  const [previewUrl,  setPreviewUrl]  = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [uploaded,    setUploaded]    = useState<File | null>(null);

  // Start camera/mic preview
  async function startPreview(m: MediaMode) {
    try {
      const constraints = m === 'video'
        ? { video: { facingMode: 'user' }, audio: true }
        : { video: false, audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current && m === 'video') {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setError(null);
    } catch (err) {
      setError('Camera/mic access denied. Please allow access and try again, or upload a file instead.');
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  async function handleModeChange(m: MediaMode) {
    stopStream();
    setMode(m);
    setRecordState('idle');
    setPreviewUrl(null);
    setElapsed(0);
    await startPreview(m);
  }

  useEffect(() => {
    startPreview('video');
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Countdown then record
  async function startRecording() {
    setRecordState('countdown');
    setCountdown(3);

    let c = 3;
    const cd = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(cd);
        beginRecording();
      }
    }, 1000);
  }

  function beginRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];

    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm',
    });

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url  = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setRecordState('preview');
      stopStream();
    };

    recorder.start(100);
    recorderRef.current = recorder;
    setRecordState('recording');
    setElapsed(0);

    // Auto-stop at MAX_SECONDS
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        if (prev >= MAX_SECONDS - 1) {
          stopRecording();
          return MAX_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
  }

  function reRecord() {
    setPreviewUrl(null);
    setElapsed(0);
    setRecordState('idle');
    startPreview(mode);
  }

  function confirmRecording() {
    if (!previewUrl) return;
    fetch(previewUrl)
      .then(r => r.blob())
      .then(blob => {
        const file = new File(
          [blob],
          `memory-${Date.now()}.${mode === 'audio' ? 'webm' : 'webm'}`,
          { type: blob.type }
        );
        setRecordState('done');
        onComplete(file, mode);
      });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploaded(file);
    setRecordState('done');
    onComplete(file, file.type.startsWith('video') ? 'video' : 'audio');
  }

  const progressPct = (elapsed / MAX_SECONDS) * 100;

  return (
    <div style={{ width: '100%', maxWidth: 520 }}>

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 4px' }}>
          Record your memory clip
        </h3>
        <p style={{ fontSize: 13, color: '#888', margin: 0, lineHeight: 1.6 }}>
          This plays when anyone scans the QR on your print.
          Saved forever — scannable at your 1, 5, and 10-year anniversary.
        </p>
      </div>

      {/* Mode selector */}
      {recordState === 'idle' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(['video', 'audio'] as MediaMode[]).map(m => (
            <button key={m}
              onClick={() => handleModeChange(m)}
              style={{
                flex: 1, padding: '10px',
                border: mode === m ? '1px solid #4ADE80' : '1px solid #333',
                borderRadius: 8,
                background: mode === m ? '#0d1f0d' : 'transparent',
                color: mode === m ? '#4ADE80' : '#888',
                fontSize: 13, cursor: 'pointer', fontWeight: 500,
              }}
            >
              {m === 'video' ? '🎥 Video message' : '🎙️ Voice only'}
            </button>
          ))}
        </div>
      )}

      {/* Camera preview */}
      {(recordState === 'idle' || recordState === 'countdown' ||
        recordState === 'recording') && mode === 'video' && (
        <div style={{
          position: 'relative', borderRadius: 10,
          overflow: 'hidden', background: '#000',
          marginBottom: 12, aspectRatio: '4/3',
        }}>
          <video ref={videoRef} muted playsInline
            style={{ width: '100%', height: '100%',
                     objectFit: 'cover', display: 'block',
                     transform: 'scaleX(-1)' }}
          />

          {/* Countdown overlay */}
          {recordState === 'countdown' && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)',
            }}>
              <span style={{ fontSize: 80, fontWeight: 700,
                             color: '#4ADE80' }}>
                {countdown}
              </span>
            </div>
          )}

          {/* Recording indicator */}
          {recordState === 'recording' && (
            <div style={{
              position: 'absolute', top: 10, left: 10,
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(0,0,0,0.7)', borderRadius: 20,
              padding: '4px 10px',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#ff4444',
                animation: 'pulse 1s infinite',
              }}/>
              <span style={{ color: '#fff', fontSize: 12 }}>
                {elapsed}s / {MAX_SECONDS}s
              </span>
            </div>
          )}
        </div>
      )}

      {/* Audio recording indicator */}
      {(recordState === 'recording') && mode === 'audio' && (
        <div style={{
          background: '#111', borderRadius: 10, padding: '24px',
          textAlign: 'center', marginBottom: 12,
          border: '1px solid #222',
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎙️</div>
          <p style={{ color: '#4ADE80', fontWeight: 600,
                      margin: '0 0 8px' }}>
            Recording… {elapsed}s
          </p>
          <div style={{
            height: 6, background: '#333', borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progressPct}%`, height: '100%',
              background: '#4ADE80', borderRadius: 3,
              transition: 'width 1s linear',
            }}/>
          </div>
        </div>
      )}

      {/* Playback preview */}
      {recordState === 'preview' && previewUrl && (
        <div style={{ marginBottom: 12 }}>
          <video src={previewUrl} controls
            style={{
              width: '100%', borderRadius: 10,
              background: '#000', display: 'block',
            }}
          />
        </div>
      )}

      {/* Done state */}
      {recordState === 'done' && (
        <div style={{
          background: '#0d1f0d', borderRadius: 10, padding: '16px',
          textAlign: 'center', marginBottom: 12,
          border: '1px solid #1a3a1a',
        }}>
          <p style={{ color: '#4ADE80', fontWeight: 600,
                      fontSize: 15, margin: '0 0 4px' }}>
            ✓ Memory clip ready
          </p>
          <p style={{ color: '#888', fontSize: 12, margin: 0 }}>
            {uploaded ? uploaded.name : `${elapsed}s ${mode} message recorded`}
          </p>
        </div>
      )}

      {error && (
        <p style={{ color: '#ff6b6b', fontSize: 13,
                    margin: '0 0 12px', lineHeight: 1.5 }}>
          {error}
        </p>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {recordState === 'idle' && (
          <button onClick={startRecording}
            style={{
              width: '100%', padding: 14, background: '#4ADE80',
              color: '#000', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Start recording →
          </button>
        )}

        {recordState === 'recording' && (
          <button onClick={stopRecording}
            style={{
              width: '100%', padding: 14, background: '#ff4444',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Stop recording
          </button>
        )}

        {recordState === 'preview' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={reRecord}
              style={{
                flex: 1, padding: 12, border: '1px solid #333',
                borderRadius: 10, background: 'transparent',
                color: '#fff', fontSize: 13, cursor: 'pointer',
              }}
            >
              Re-record
            </button>
            <button onClick={confirmRecording}
              style={{
                flex: 2, padding: 12, background: '#4ADE80',
                color: '#000', border: 'none', borderRadius: 10,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Use this clip →
            </button>
          </div>
        )}

        {recordState === 'done' && (
          <button onClick={reRecord}
            style={{
              width: '100%', padding: 12, border: '1px solid #333',
              borderRadius: 10, background: 'transparent',
              color: '#888', fontSize: 13, cursor: 'pointer',
            }}
          >
            Re-record
          </button>
        )}

        {/* Upload option */}
        {recordState !== 'recording' && recordState !== 'countdown' && (
          <label style={{
            display: 'block', padding: '12px',
            border: '1px dashed #333', borderRadius: 10,
            textAlign: 'center', cursor: 'pointer',
            color: '#666', fontSize: 13,
          }}>
            <input type="file" accept="video/*,audio/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            Or upload a video/audio file
          </label>
        )}

        {/* Skip */}
        <button onClick={onSkip}
          style={{
            width: '100%', padding: 10, background: 'transparent',
            border: 'none', color: '#555', fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Skip — add a memory clip later
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}