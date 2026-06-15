import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { countIndependentSupport, governByCorroboration } from './corroboration.ts';

Deno.test('counts distinct supporting domains only', () => {
  const ev = [
    { stance: 'supports', source_url: 'https://www.reuters.com/a' },
    { stance: 'supports', source_url: 'https://reuters.com/b' },          // same domain
    { stance: 'supports', source_url: 'https://ft.com/c' },               // distinct
    { stance: 'refutes', source_url: 'https://bloomberg.com/d' },         // not supporting
    { stance: 'supports', source_url: null },                            // url-less, ignored
  ];
  assertEquals(countIndependentSupport(ev), 2);
});

Deno.test('two independent sources -> supported stands', () => {
  const ev = [
    { stance: 'supports', source_url: 'https://reuters.com/a' },
    { stance: 'supports', source_url: 'https://ft.com/b' },
  ];
  const r = governByCorroboration('supported', 0.8, ev);
  assertEquals(r.governed, false);
  assertEquals(r.verdict, 'supported');
  assertEquals(r.confidence, 0.8);
});

Deno.test('single source -> supported downgraded to unverified + capped', () => {
  const ev = [{ stance: 'supports', source_url: 'https://oneblog.com/a' }];
  const r = governByCorroboration('supported', 0.9, ev);
  assertEquals(r.governed, true);
  assertEquals(r.verdict, 'unverified');
  assertEquals(r.confidence, 0.35);
  assertEquals(r.independentSources, 1);
});

Deno.test('non-supported verdicts are never governed', () => {
  const ev = [{ stance: 'supports', source_url: 'https://oneblog.com/a' }];
  assertEquals(governByCorroboration('contested', 0.7, ev).governed, false);
  assertEquals(governByCorroboration('unverified', 0.3, ev).governed, false);
});
