"use client";
import { useEffect, useRef, useState } from "react";
import { types } from "mediasoup-client";

type Ref<T> = { current: T | null };

interface MediaStats {
  videoBitrate: string;
  videoResolution: string;
  videoFramerate: string;
  videoPacketsLost: string;
  videoJitter: string;
  videoRtt: string;
  videoCodec: string;
  audioBitrate: string;
  audioPacketsLost: string;
  audioJitter: string;
  audioRtt: string;
  audioCodec: string;
}

interface MediaStatsOverlayProps {
  // Pass refs so the interval always reads the latest value even if the
  // consumer/producer was assigned after the component first rendered.
  videoProducerRef?: Ref<types.Producer>;
  audioProducerRef?: Ref<types.Producer>;
  videoConsumerRef?: Ref<types.Consumer>;
  audioConsumerRef?: Ref<types.Consumer>;
}

interface ByteSample { bytes: number; ts: number }

function fmt(n: number | undefined, decimals = 0) {
  if (n == null || isNaN(n)) return "—";
  return decimals > 0 ? n.toFixed(decimals) : String(Math.round(n));
}

async function extractStats(
  target: types.Producer | types.Consumer | null | undefined,
  prevSample: Ref<ByteSample>,
  kind: "video" | "audio",
): Promise<Partial<MediaStats>> {
  if (!target) return {};

  let report: RTCStatsReport;
  try {
    report = await target.getStats();
  } catch {
    return {};
  }

  const result: Partial<MediaStats> = {};
  const now = Date.now();

  // Build codec map: id -> mimeType
  const codecMap: Record<string, string> = {};
  report.forEach((s: any) => {
    if (s.type === "codec" && s.mimeType) {
      codecMap[s.id] = s.mimeType.split("/")[1]?.toUpperCase() ?? "—";
    }
  });

  report.forEach((s: any) => {
    // ── Outbound (producer / sender) ──────────────────────────────────────
    if (s.type === "outbound-rtp" && s.kind === kind) {
      const prev = prevSample.current;
      const elapsed = prev ? now - prev.ts : 0;
      const bytesDiff = prev ? Math.max(0, s.bytesSent - prev.bytes) : 0;
      prevSample.current = { bytes: s.bytesSent, ts: now };

      const bitrate = elapsed > 0 ? ((bytesDiff * 8) / elapsed).toFixed(1) + " kbps" : "…";

      if (kind === "video") {
        result.videoBitrate = bitrate;
        result.videoFramerate = s.framesPerSecond != null ? fmt(s.framesPerSecond) + " fps" : "—";
        if (s.frameWidth && s.frameHeight)
          result.videoResolution = `${s.frameWidth}×${s.frameHeight}`;
        if (s.codecId && codecMap[s.codecId]) result.videoCodec = codecMap[s.codecId];
      } else {
        result.audioBitrate = bitrate;
        if (s.codecId && codecMap[s.codecId]) result.audioCodec = codecMap[s.codecId];
      }
    }

    // ── Inbound (consumer / receiver) ─────────────────────────────────────
    if (s.type === "inbound-rtp" && s.kind === kind) {
      const prev = prevSample.current;
      const elapsed = prev ? now - prev.ts : 0;
      const bytesDiff = prev ? Math.max(0, s.bytesReceived - prev.bytes) : 0;
      prevSample.current = { bytes: s.bytesReceived, ts: now };

      const bitrate = elapsed > 0 ? ((bytesDiff * 8) / elapsed).toFixed(1) + " kbps" : "…";
      const totalPkts = (s.packetsReceived ?? 0) + (s.packetsLost ?? 0);
      const loss = totalPkts > 0 ? ((s.packetsLost / totalPkts) * 100).toFixed(1) + "%" : "0%";

      if (kind === "video") {
        result.videoBitrate = bitrate;
        result.videoPacketsLost = loss;
        result.videoJitter = s.jitter != null ? (s.jitter * 1000).toFixed(1) + " ms" : "—";
        result.videoFramerate = s.framesPerSecond != null ? fmt(s.framesPerSecond) + " fps" : "—";
        if (s.frameWidth && s.frameHeight)
          result.videoResolution = `${s.frameWidth}×${s.frameHeight}`;
        if (s.codecId && codecMap[s.codecId]) result.videoCodec = codecMap[s.codecId];
      } else {
        result.audioBitrate = bitrate;
        result.audioPacketsLost = loss;
        result.audioJitter = s.jitter != null ? (s.jitter * 1000).toFixed(1) + " ms" : "—";
        if (s.codecId && codecMap[s.codecId]) result.audioCodec = codecMap[s.codecId];
      }
    }

    // ── RTT (sender side) ─────────────────────────────────────────────────
    if (s.type === "remote-inbound-rtp" && s.kind === kind) {
      const rtt = s.roundTripTime != null ? (s.roundTripTime * 1000).toFixed(0) + " ms" : "—";
      if (kind === "video") result.videoRtt = rtt;
      else result.audioRtt = rtt;
    }

    // ── RTT (receiver side — from ICE candidate pair) ─────────────────────
    if (s.type === "candidate-pair" && s.state === "succeeded" && s.currentRoundTripTime != null) {
      const rtt = (s.currentRoundTripTime * 1000).toFixed(0) + " ms";
      if (!result.videoRtt) result.videoRtt = rtt;
      if (!result.audioRtt) result.audioRtt = rtt;
    }
  });

  return result;
}

export default function MediaStatsOverlay({
  videoProducerRef,
  audioProducerRef,
  videoConsumerRef,
  audioConsumerRef,
}: MediaStatsOverlayProps) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<Partial<MediaStats>>({});

  // Per-kind byte samples — separate refs for video and audio
  const prevVideoSample = useRef<ByteSample | null>(null);
  const prevAudioSample = useRef<ByteSample | null>(null);

  useEffect(() => {
    if (!open) return;

    const update = async () => {
      const videoTarget = videoProducerRef?.current ?? videoConsumerRef?.current;
      const audioTarget = audioProducerRef?.current ?? audioConsumerRef?.current;

      const [vStats, aStats] = await Promise.all([
        extractStats(videoTarget, prevVideoSample, "video"),
        extractStats(audioTarget, prevAudioSample, "audio"),
      ]);

      setStats((prev) => ({ ...prev, ...vStats, ...aStats }));
    };

    // First tick immediately, then every second
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [open]); // intentionally no deps on refs — interval always reads .current

  const rows: { label: string; video: string; audio: string }[] = [
    { label: "Bitrate",     video: stats.videoBitrate     ?? "—", audio: stats.audioBitrate     ?? "—" },
    { label: "Jitter",      video: stats.videoJitter      ?? "—", audio: stats.audioJitter      ?? "—" },
    { label: "Latency",     video: stats.videoRtt         ?? "—", audio: stats.audioRtt         ?? "—" },
    { label: "Packet Loss", video: stats.videoPacketsLost ?? "—", audio: stats.audioPacketsLost ?? "—" },
    { label: "Frame Rate",  video: stats.videoFramerate   ?? "—", audio: "—" },
    { label: "Resolution",  video: stats.videoResolution  ?? "—", audio: "—" },
    { label: "Codec",       video: stats.videoCodec       ?? "—", audio: stats.audioCodec       ?? "—" },
  ];

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Connection stats"
        className={`backdrop-blur-sm p-2 rounded-lg transition flex items-center justify-center ${
          open ? "bg-white/20 text-white" : "bg-black/50 hover:bg-black/70 text-white"
        }`}
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <rect x="1"  y="12" width="3" height="7" rx="1" />
          <rect x="6"  y="8"  width="3" height="11" rx="1" />
          <rect x="11" y="4"  width="3" height="15" rx="1" />
          <rect x="16" y="1"  width="3" height="18" rx="1" />
        </svg>
      </button>

      {/* Stats table */}
      {open && (
        <div className="absolute top-12 right-0 z-30 w-64 sm:w-72 max-w-[calc(100vw-2rem)] bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-3 border-b border-white/10 bg-white/5">
            <div className="px-3 py-1.5" />
            <div className="px-3 py-1.5 text-center border-l border-white/10">
              <span className="text-xs font-semibold text-blue-400">Video</span>
            </div>
            <div className="px-3 py-1.5 text-center border-l border-white/10">
              <span className="text-xs font-semibold text-green-400">Audio</span>
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-3 ${i < rows.length - 1 ? "border-b border-white/5" : ""}`}
            >
              <div className="px-3 py-2 flex items-center">
                <span className="text-xs text-gray-400">{row.label}</span>
              </div>
              <div className="px-3 py-2 text-center border-l border-white/5">
                <span className="text-xs text-white tabular-nums font-medium">{row.video}</span>
              </div>
              <div className="px-3 py-2 text-center border-l border-white/5">
                <span className="text-xs text-white tabular-nums font-medium">{row.audio}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
