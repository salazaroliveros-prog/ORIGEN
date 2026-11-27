import { GoogleAuth } from 'google-auth-library';

const KEY_FILE =
  'C:/Users/wilso/Pictures/origen-erp-guatemala-firebase-adminsdk-fbsvc-58f3a985e4.json';
const PROJECT = 'origen-erp-guatemala';
const NEW_DOMAIN = '127.0.0.1';
const auth = new GoogleAuth({
  keyFile: KEY_FILE,
  scopes: [
    'https://www.googleapis.com/auth/firebase',
    'https://www.googleapis.com/auth/cloud-platform',
  ],
});
const client = await auth.getClient();
const { token } = await client.getAccessToken();
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const base = `https://identitytoolkit.googleapis.com/v2/projects/${PROJECT}/config`;
const before = await (await fetch(base, { headers })).json();
const domains = before.authorizedDomains ?? [];
if (!domains.includes(NEW_DOMAIN)) domains.push(NEW_DOMAIN);
const patch = await fetch(`${base}?updateMask=authorizedDomains`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({ authorizedDomains: domains }),
});
console.log('PATCH_STATUS:', patch.status);
const after = await (await fetch(base, { headers })).json();
console.log('AUTHORIZED_DOMAINS:', JSON.stringify(after.authorizedDomains ?? []));
