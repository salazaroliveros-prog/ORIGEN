const GMAIL_SEND_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function encodeBase64Url(value: string): string {
  return encodeBase64(value).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function encodeHeader(value: string): string {
  return `=?UTF-8?B?${encodeBase64(value)}?=`;
}

export async function sendGmailMessage(
  accessToken: string,
  message: { to: string; subject: string; body: string }
): Promise<string> {
  const recipient = message.to.trim();
  const subject = message.subject.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || recipient.length > 254) {
    throw new Error('Ingresa un correo de destino válido.');
  }
  if (!subject || /[\r\n]/.test(subject) || subject.length > 250) {
    throw new Error('El asunto es obligatorio y no puede incluir saltos de línea.');
  }
  if (!message.body.trim() || message.body.length > 100_000) {
    throw new Error('El mensaje debe tener contenido y no superar 100,000 caracteres.');
  }

  const rawMessage = [
    `To: ${recipient}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    encodeBase64(message.body),
  ].join('\r\n');
  const response = await fetch(GMAIL_SEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodeBase64Url(rawMessage) }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('El permiso de Google venció o fue revocado. Autoriza Gmail nuevamente.');
    }
    if (response.status === 403) {
      throw new Error(
        'Google no autorizó el envío. Verifica que el permiso Gmail send esté habilitado para esta aplicación.'
      );
    }
    const errorBody: { error?: { message?: unknown } } = await response.json().catch(() => ({}));
    const detail =
      typeof errorBody.error?.message === 'string' ? `: ${errorBody.error.message}` : '';
    throw new Error(`Gmail rechazó el envío (HTTP ${response.status})${detail}`);
  }

  const sentMessage: { id?: unknown } = await response.json();
  if (typeof sentMessage.id !== 'string' || !sentMessage.id) {
    throw new Error('Gmail respondió sin confirmar el identificador del mensaje enviado.');
  }
  return sentMessage.id;
}
