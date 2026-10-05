import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Development only: lets a phone on the same network load the dev server's
  // scripts (Next blocks them for any origin other than localhost by default).
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*"],
};

export default nextConfig;
