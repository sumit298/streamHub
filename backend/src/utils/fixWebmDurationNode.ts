/**
 * Node.js-compatible WebM duration patcher.
 *
 * fix-webm-duration is a browser library that uses FileReader + Blob.
 * Neither exists in Node. This wrapper bypasses those APIs by feeding the
 * internal WebmFile parser a Uint8Array (which it already uses internally)
 * and reading the fixed bytes back via Uint8Array.buffer — no Blob needed.
 */

import fixWebmDurationBrowser from "fix-webm-duration";

const g = global as unknown as {
  FileReader?: new () => {
    onloadend: (() => void) | null;
    result: unknown;
    readAsArrayBuffer: (blob: unknown) => void;
  };
  Blob?: new (parts: unknown[]) => { __arrayBuffer: unknown; type: string };
};

async function fixWebmDurationNode(
  inputBuffer: Buffer,
  durationMs: number,
): Promise<Buffer> {
  // Convert Node Buffer → ArrayBuffer (shared memory, zero-copy)
  const arrayBuffer = inputBuffer.buffer.slice(
    inputBuffer.byteOffset,
    inputBuffer.byteOffset + inputBuffer.byteLength,
  );

  return new Promise((resolve: (buffer: Buffer) => void) => {
    // Stub the minimum browser APIs the library needs
    const originalFileReader = g.FileReader;
    const originalBlob = g.Blob;

    // Stub FileReader: immediately "reads" the ArrayBuffer synchronously
    g.FileReader = function (this: {
      onloadend: (() => void) | null;
      result: unknown;
      readAsArrayBuffer: (blob: unknown) => void;
    }) {
      this.onloadend = null;
      this.readAsArrayBuffer = (blob: unknown) => {
        this.result =
          (blob as { __arrayBuffer: unknown }).__arrayBuffer || blob;
        if (this.onloadend) this.onloadend();
      };
    } as unknown as typeof g.FileReader;

    // Stub Blob: stores the source array so we can extract bytes after fix
    g.Blob = function (
      this: { __arrayBuffer: unknown; type: string },
      parts: unknown[],
    ) {
      this.__arrayBuffer = parts[0];
      this.type = "video/webm";
    } as unknown as typeof g.Blob;

    fixWebmDurationBrowser(
      Object.assign(new g.Blob!([arrayBuffer]), {
        __arrayBuffer: arrayBuffer,
      }) as unknown as Blob,
      durationMs,
      (fixedBlob) => {
        // Restore globals
        if (originalFileReader !== undefined) g.FileReader = originalFileReader;
        else delete g.FileReader;
        if (originalBlob !== undefined) g.Blob = originalBlob;
        else delete g.Blob;

        // Extract the fixed bytes from the stub Blob
        const fixedArrayBuffer = (
          fixedBlob as unknown as { __arrayBuffer: ArrayBuffer }
        ).__arrayBuffer;
        resolve(Buffer.from(fixedArrayBuffer));
      },
      { logger: false },
    );
  });
}

export default fixWebmDurationNode;
