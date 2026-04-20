"use strict";
/**
 * Node.js-compatible WebM duration patcher.
 *
 * fix-webm-duration is a browser library that uses FileReader + Blob.
 * Neither exists in Node. This wrapper bypasses those APIs by feeding the
 * internal WebmFile parser a Uint8Array (which it already uses internally)
 * and reading the fixed bytes back via Uint8Array.buffer — no Blob needed.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fix_webm_duration_1 = __importDefault(require("fix-webm-duration"));
const g = global;
async function fixWebmDurationNode(inputBuffer, durationMs) {
    // Convert Node Buffer → ArrayBuffer (shared memory, zero-copy)
    const arrayBuffer = inputBuffer.buffer.slice(inputBuffer.byteOffset, inputBuffer.byteOffset + inputBuffer.byteLength);
    return new Promise((resolve) => {
        // Stub the minimum browser APIs the library needs
        const originalFileReader = g.FileReader;
        const originalBlob = g.Blob;
        // Stub FileReader: immediately "reads" the ArrayBuffer synchronously
        g.FileReader = function () {
            this.onloadend = null;
            this.readAsArrayBuffer = (blob) => {
                this.result =
                    blob.__arrayBuffer || blob;
                if (this.onloadend)
                    this.onloadend();
            };
        };
        // Stub Blob: stores the source array so we can extract bytes after fix
        g.Blob = function (parts) {
            this.__arrayBuffer = parts[0];
            this.type = "video/webm";
        };
        (0, fix_webm_duration_1.default)(Object.assign(new g.Blob([arrayBuffer]), {
            __arrayBuffer: arrayBuffer,
        }), durationMs, (fixedBlob) => {
            // Restore globals
            if (originalFileReader !== undefined)
                g.FileReader = originalFileReader;
            else
                delete g.FileReader;
            if (originalBlob !== undefined)
                g.Blob = originalBlob;
            else
                delete g.Blob;
            // Extract the fixed bytes from the stub Blob
            const fixedArrayBuffer = fixedBlob.__arrayBuffer;
            resolve(Buffer.from(fixedArrayBuffer));
        }, { logger: false });
    });
}
exports.default = fixWebmDurationNode;
//# sourceMappingURL=fixWebmDurationNode.js.map