const dns = require("node:dns");

const hostname = "lhvarmtcprhxotharcio.supabase.co";
const address = "104.18.38.10";
const originalLookup = dns.lookup;
const originalPromiseLookup = dns.promises.lookup;

function isTarget(host) {
  return host === hostname;
}

function lookupResult(options) {
  return options?.all ? [{ address, family: 4 }] : { address, family: 4 };
}

dns.lookup = function lookup(host, options, callback) {
  const resolvedOptions = typeof options === "function" ? undefined : options;
  const resolvedCallback = typeof options === "function" ? options : callback;

  if (isTarget(host)) {
    process.nextTick(() => {
      if (resolvedOptions?.all) resolvedCallback(null, [{ address, family: 4 }]);
      else resolvedCallback(null, address, 4);
    });
    return;
  }

  return resolvedOptions === undefined
    ? originalLookup.call(dns, host, resolvedCallback)
    : originalLookup.call(dns, host, resolvedOptions, resolvedCallback);
};

dns.promises.lookup = async function lookup(host, options) {
  if (isTarget(host)) return lookupResult(options);
  return originalPromiseLookup.call(dns.promises, host, options);
};
