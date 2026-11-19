// Morrow does not use the Base Account connector. @wagmi/connectors (and some wallet SDKs) import it,
// and its SDK pulls in @coinbase/cdp-sdk modules that fail to resolve in Next.js builds.
// This stub replaces the package. Every export exists (via a Proxy), so nothing crashes with
// "x is not a function"; calling one throws a clear, named error instead.
function make(name) {
  return function baseAccountDisabled() {
    throw new Error("Base Account SDK is disabled in Morrow (" + String(name) + ")");
  };
}
module.exports = new Proxy(
  {},
  {
    get(_, key) {
      if (key === "__esModule") return true;
      if (key === "default") return module.exports;
      if (typeof key === "symbol" || key === "then") return undefined;
      return make(key);
    },
  },
);
