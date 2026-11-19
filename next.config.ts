import path from "node:path";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const baseAccountStub = path.resolve(process.cwd(), "src/lib/stubs/base-account.js");

const config: NextConfig = {
  reactStrictMode: true,
  // Type checking runs separately via `npm run typecheck`; don't block deploys on it.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  webpack: (cfg) => {
    cfg.resolve.alias = {
      ...(cfg.resolve.alias ?? {}),
      // Unused wallet SDK bundled by @wagmi/connectors (see stub for details).
      "@base-org/account": baseAccountStub,
      // Optional React Native / Node-only deps referenced by wallet SDKs.
      "@react-native-async-storage/async-storage": false,
      // Optional Solana peers of Privy. MORROW is EVM-only.
      "@solana/web3.js": false,
      "@solana/spl-token": false,
      "@solana/kit": false,
      "@solana-program/system": false,
      "@solana-program/token": false,
    };
    cfg.externals.push("pino-pretty", "lokijs", "encoding");
    return cfg;
  },
  turbopack: {
    resolveAlias: { "@base-org/account": "./src/lib/stubs/base-account.js" },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default config;
