// Render the tracker and its initialization directly in the SSR HTML.
// Keep data-domain for legacy/self-hosted scripts; modern site-specific
// scripts get their domain from the script itself and require init().
export function Plausible({ domain, src }: { domain?: string; src?: string }) {
  if (!domain && !src) return null;
  return (
    <>
      {/* Preserve init if the async tracker has already loaded. Otherwise,
          store its options for the tracker to consume when it loads. */}
      <script
        id="plausible-init"
        async
        dangerouslySetInnerHTML={{
          __html: `window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)};window.plausible.init=window.plausible.init||function(i){window.plausible.o=i||{}};window.plausible.init();`,
        }}
      />
      <script
        id="plausible-loader"
        data-domain={domain || undefined}
        src={src || 'https://plausible.io/js/script.js'}
        defer
        async
      />
    </>
  );
}
