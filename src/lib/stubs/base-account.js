// MORROW does not use the Base Account connector. @wagmi/connectors bundles it,
// and its SDK pulls in @coinbase/cdp-sdk modules that fail to resolve in Next.js builds.
// This stub replaces the package so the unused connector compiles to nothing.
function unsupported() {
  throw new Error("Base Account is not supported in MORROW.");
}
export const createBaseAccountSDK = unsupported;
export default { createBaseAccountSDK: unsupported };
