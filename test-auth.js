const http = require('http');

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve({ status: res.statusCode, headers: res.headers, body: data }); });
    });
    req.on('error', reject);
    req.end();
  });
}

async function testRoutes() {
  console.log('🧪 Testing Auto-Login ORIGEN-1\n');
  
  // Test 1: Página principal - should auto-login
  try {
    const result = await makeRequest('/', 'GET');
    console.log();
    if (result.body && result.body.includes('h1')) {
      console.log('   ✅ HTML contenido cargado');
    }
  } catch (err) {
    console.log();
  }
  
  // Test 2: Configuración Firebase - should work
  try {
    const result = await makeRequest('/api/firebase-config.js', 'GET');
    console.log();
    if (result.body && result.body.includes('AIzaSy')) {
      console.log('   ✅ Config Firebase real cargada');
    }
  } catch (err) {
    console.log();
  }
  
  // Test 3: API Gemini - should work
  try {
    const body = { action: 'chat', message: 'test' };
    const result = await makeRequest('/api/gemini', 'POST', body);
    console.log();
    if (result.body && result.body.length > 0) {
      console.log('   ✅ Respuesta IA recibida');
    }
  } catch (err) {
    console.log();
  }
}

testRoutes();
