import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendGmailMessage } from './gmail';

describe('sendGmailMessage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('encodes a plain-text UTF-8 Gmail message and returns its confirmed id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'gmail-message-123' }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendGmailMessage('temporary-token', {
      to: 'client@example.com',
      subject: 'Avance de obra — octubre',
      body: 'Resumen de construcción en Guatemala.',
    })).resolves.toBe('gmail-message-123');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/users/me/messages/send');
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer temporary-token',
      'Content-Type': 'application/json',
    });
    const payload = JSON.parse(String(options.body)) as { raw: string };
    const standardBase64 = payload.raw.replaceAll('-', '+').replaceAll('_', '/') + '=='.slice((payload.raw.length + 3) % 4);
    const mime = Buffer.from(standardBase64, 'base64').toString('utf8');
    expect(mime).toContain('To: client@example.com');
    expect(mime).toContain('=?UTF-8?B?');
    expect(mime).toContain(Buffer.from('Resumen de construcción en Guatemala.', 'utf8').toString('base64'));
  });

  it('rejects header injection and invalid recipients before making a request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendGmailMessage('token', {
      to: 'bad\r\nBcc: attacker@example.com',
      subject: 'Reporte',
      body: 'Contenido',
    })).rejects.toThrow('correo de destino válido');
    await expect(sendGmailMessage('token', {
      to: 'client@example.com',
      subject: 'Reporte\r\nBcc: attacker@example.com',
      body: 'Contenido',
    })).rejects.toThrow('no puede incluir saltos de línea');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports expired authorization rather than a success-shaped fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));

    await expect(sendGmailMessage('expired-token', {
      to: 'client@example.com',
      subject: 'Reporte',
      body: 'Contenido',
    })).rejects.toThrow('Autoriza Gmail nuevamente');
  });
});
