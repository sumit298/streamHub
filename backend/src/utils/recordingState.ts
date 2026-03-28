// Shared in-process state for VOD recording lifecycle.
// Both the HTTP route and socket handlers write/read this.
const finalizedRecordings = new Set<string>();

export { finalizedRecordings }
