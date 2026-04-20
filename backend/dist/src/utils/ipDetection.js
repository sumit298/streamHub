"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectAndSetIP = detectAndSetIP;
const os_1 = __importDefault(require("os"));
function detectAndSetIP() {
    const nets = os_1.default.networkInterfaces();
    const detectedIPs = [];
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === "IPv4" && !net.internal) {
                detectedIPs.push(net.address);
            }
        }
    }
    console.log(`🌐 Detected local IPs: ${detectedIPs.join(", ") || "none"}`);
    console.log(`🌐 ANNOUNCED_IP env var: ${process.env.ANNOUNCED_IP || "not set"}`);
    if (!process.env.ANNOUNCED_IP &&
        process.env.NODE_ENV === "development" &&
        detectedIPs.length > 0) {
        process.env.ANNOUNCED_IP = detectedIPs[0];
        console.log(`🌐 Auto-set ANNOUNCED_IP to: ${detectedIPs[0]}`);
    }
}
//# sourceMappingURL=ipDetection.js.map