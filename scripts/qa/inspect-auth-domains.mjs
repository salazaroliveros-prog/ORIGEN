import { GoogleAuth } from 'google-auth-library';

const KEY_FILE = 'C:/Users/wilso/Pictures/origen-erp-guatemala-firebase-adminsdk-fbsvc-58f3a985e4.json';
const PROJECT = 'origen-erp-guatemala';
const auth = new GoogleAuth({
  keyFile: KEY_FILE,
  scopes: ['https://www.googleapis.com/auth/firebase', 'https://www.googleapis.com/auth/cloud-platform'],
});
const client = await auth.getClient();
const { token } = await client.getAccessToken();
const url = `https://identitytoolkit.googleapis.com/v2/projects/${PROJECT}/config`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
const config = await res.json();
console.log('STATUS:', res.status);
console.log('AUTHORIZED_DOMAINS:', JSON.stringify(config.authorizedDomains ?? []));

