import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy } from '@/middleware';

describe('buildContentSecurityPolicy', () => {
  it('does not open the Firebase emulators in production', () => {
    const csp = buildContentSecurityPolicy(false);

    expect(csp).not.toContain('127.0.0.1:9099');
    expect(csp).not.toContain('127.0.0.1:8080');
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('allows the Firebase emulators when they are enabled', () => {
    const csp = buildContentSecurityPolicy(true);

    // Sin esto el navegador bloquea signInWithPassword y el E2E no autentica.
    expect(csp).toContain('http://127.0.0.1:9099');
    expect(csp).toContain('http://127.0.0.1:8080');
    expect(csp).toContain('http://127.0.0.1:9199');
    // En emulador no se puede forzar https sobre localhost.
    expect(csp).not.toContain('upgrade-insecure-requests');
  });
});
