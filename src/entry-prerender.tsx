/* eslint-disable react-refresh/only-export-components -- build-time SSR entry, not an HMR component module */
// SSR render entry for static prerendering of the public marketing routes.
// Browser-free (renderToStaticMarkup) so it runs in CI/Vercel with no chromium.
// The output HTML is for crawlers/LLM fetchers; the client app still mounts on top.
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { CtrlOnboarding } from '@/components/onboarding/CtrlOnboarding';
import AgentsPage from '@/pages/Agents';
import TryPage from '@/pages/Try';

const ROUTES: Record<string, () => JSX.Element> = {
  '/': CtrlOnboarding,
  '/agents': AgentsPage,
  '/try': TryPage,
};

export const ROUTE_PATHS = Object.keys(ROUTES);

export function render(url: string): string {
  const Comp = ROUTES[url];
  if (!Comp) return '';
  return renderToStaticMarkup(
    <StaticRouter location={url}>
      <Comp />
    </StaticRouter>,
  );
}
