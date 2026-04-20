/**
 * Node.js-compatible WebM duration patcher.
 *
 * fix-webm-duration is a browser library that uses FileReader + Blob.
 * Neither exists in Node. This wrapper bypasses those APIs by feeding the
 * internal WebmFile parser a Uint8Array (which it already uses internally)
 * and reading the fixed bytes back via Uint8Array.buffer — no Blob needed.
 */
declare function fixWebmDurationNode(inputBuffer: Buffer, durationMs: number): Promise<Buffer>;
export default fixWebmDurationNode;
