import os from "os";
import logger from "./logger";

export function detectAndSetIP(): void {
  const nets = os.networkInterfaces();
  const detectedIPs: string[] = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === "IPv4" && !net.internal) {
        detectedIPs.push(net.address);
      }
    }
  }
  console.log(`🌐 Detected local IPs: ${detectedIPs.join(", ") || "none"}`);
  console.log(
    `🌐 ANNOUNCED_IP env var: ${process.env.ANNOUNCED_IP || "not set"}`,
  );
  if (
    !process.env.ANNOUNCED_IP &&
    process.env.NODE_ENV === "development" &&
    detectedIPs.length > 0
  ) {
    process.env.ANNOUNCED_IP = detectedIPs[0];
    console.log(`🌐 Auto-set ANNOUNCED_IP to: ${detectedIPs[0]}`);
  }
}
