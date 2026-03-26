/**
 * Node.js-compatible WebM duration patcher.
 *
 * fix-webm-duration is a browser library that uses FileReader + Blob.
 * Neither exists in Node. This wrapper bypasses those APIs by feeding the
 * internal WebmFile parser a Uint8Array (which it already uses internally)
 * and reading the fixed bytes back via Uint8Array.buffer — no Blob needed.
 */

const fixWebmDurationBrowser = require("fix-webm-duration");

/**
 * Patch the duration field in a WebM file buffer.
 *
 * @param {Buffer} inputBuffer - Raw WebM file contents (Node Buffer)
 * @param {number} durationMs  - Recording duration in milliseconds
 * @returns {Buffer}           - Fixed WebM file contents (Node Buffer)
 */
async function fixWebmDurationNode(inputBuffer, durationMs) {
  // Convert Node Buffer → ArrayBuffer (shared memory, zero-copy)
  const arrayBuffer = inputBuffer.buffer.slice(
    inputBuffer.byteOffset,
    inputBuffer.byteOffset + inputBuffer.byteLength,
  );

  return new Promise((resolve) => {
    // Stub the minimum browser APIs the library needs
    const originalFileReader = global.FileReader;
    const originalBlob = global.Blob;

    // Stub FileReader: immediately "reads" the ArrayBuffer synchronously
    global.FileReader = function () {
      this.onloadend = null;
      this.readAsArrayBuffer = (blob) => {
        this.result = blob.__arrayBuffer || blob;
        if (this.onloadend) this.onloadend();
      };
    };

    // Stub Blob: stores the source array so we can extract bytes after fix
    global.Blob = function (parts) {
      this.__arrayBuffer = parts[0]; // Uint8Array.buffer
      this.type = "video/webm";
    };

    fixWebmDurationBrowser(
      // Pass a fake Blob wrapping the real ArrayBuffer
      Object.assign(new global.Blob([arrayBuffer]), { __arrayBuffer: arrayBuffer }),
      durationMs,
      (fixedBlob) => {
        // Restore globals
        if (originalFileReader !== undefined) global.FileReader = originalFileReader;
        else delete global.FileReader;
        if (originalBlob !== undefined) global.Blob = originalBlob;
        else delete global.Blob;

        // Extract the fixed bytes from the stub Blob
        const fixedArrayBuffer = fixedBlob.__arrayBuffer;
        resolve(Buffer.from(fixedArrayBuffer));
      },
      { logger: false },
    );
  });
}

module.exports = fixWebmDurationNode;
