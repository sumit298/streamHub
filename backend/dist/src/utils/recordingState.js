"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizedRecordings = void 0;
// Shared in-process state for VOD recording lifecycle.
// Both the HTTP route and socket handlers write/read this.
const finalizedRecordings = new Set();
exports.finalizedRecordings = finalizedRecordings;
//# sourceMappingURL=recordingState.js.map