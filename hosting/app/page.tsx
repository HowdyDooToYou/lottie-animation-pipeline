import studioHtml from '../generated/studio-index.html?raw';
import { StudioLoader } from './studio-loader';

export default function HomePage() {
  const scriptSource = requiredMatch(
    studioHtml,
    /<script[^>]+type="module"[^>]+src="([^"]+)"/,
    'module script',
  );
  const stylesheetSources = [
    ...studioHtml.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g),
  ].map((match) => match[1]);
  const preloadSources = [
    ...studioHtml.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g),
  ].map((match) => match[1]);

  return (
    <>
      {preloadSources.map((source) => (
        <link key={source} rel="modulepreload" href={source} crossOrigin="" />
      ))}
      {stylesheetSources.map((source) => (
        <link key={source} rel="stylesheet" href={source} crossOrigin="" />
      ))}
      <div id="root" />
      <StudioLoader source={scriptSource} />
    </>
  );
}

function requiredMatch(source: string, pattern: RegExp, label: string): string {
  const match = source.match(pattern);
  if (!match?.[1]) throw new Error(`Generated studio HTML is missing its ${label}`);
  return match[1];
}
