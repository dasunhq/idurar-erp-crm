#!/usr/bin/env node

const http = require('http');

function testSecurityHeaders() {
  console.log('🔍 Testing security headers on http://localhost:3000\n');

  const req = http.get('http://localhost:3000', (res) => {
    console.log(`Status Code: ${res.statusCode}\n`);
    
    console.log('📋 Security Headers Analysis:');
    console.log('═══════════════════════════════════════════════════\n');

    // Check CSP
    const csp = res.headers['content-security-policy'];
    if (csp) {
      console.log('✅ Content-Security-Policy: PRESENT');
      console.log(`   Value: ${csp}`);
      
      // Check for unsafe directives
      if (csp.includes("'unsafe-eval'")) {
        console.log('   ⚠️  WARNING: Contains unsafe-eval (required for Vite dev mode)');
      } else {
        console.log('   ✅ No unsafe-eval detected');
      }
      
      if (csp.includes("'unsafe-inline'")) {
        console.log('   ⚠️  WARNING: Contains unsafe-inline (limited to dev mode)');
      } else {
        console.log('   ✅ No unsafe-inline detected');
      }
      
      if (csp.includes('nonce-')) {
        console.log('   ✅ Nonce-based CSP detected');
      }
    } else {
      console.log('❌ Content-Security-Policy: MISSING');
    }

    console.log('\n');

    // Check X-Content-Type-Options
    const xContentType = res.headers['x-content-type-options'];
    if (xContentType === 'nosniff') {
      console.log('✅ X-Content-Type-Options: nosniff');
    } else {
      console.log('❌ X-Content-Type-Options: MISSING or incorrect');
    }

    // Check X-Frame-Options
    const xFrame = res.headers['x-frame-options'];
    if (xFrame === 'DENY') {
      console.log('✅ X-Frame-Options: DENY');
    } else {
      console.log('❌ X-Frame-Options: MISSING or incorrect');
    }

    // Check CORS
    const cors = res.headers['access-control-allow-origin'];
    if (cors === '*') {
      console.log('❌ Access-Control-Allow-Origin: * (Too permissive!)');
    } else if (cors) {
      console.log(`✅ Access-Control-Allow-Origin: ${cors} (Restricted)`);
    } else {
      console.log('⚠️  Access-Control-Allow-Origin: Not set');
    }

    // Check X-Powered-By
    const xPoweredBy = res.headers['x-powered-by'];
    if (xPoweredBy) {
      console.log(`❌ X-Powered-By: ${xPoweredBy} (Information leak!)`);
    } else {
      console.log('✅ X-Powered-By: Removed');
    }

    // Check HSTS
    const hsts = res.headers['strict-transport-security'];
    if (hsts) {
      console.log(`✅ Strict-Transport-Security: ${hsts}`);
    } else {
      console.log('⚠️  Strict-Transport-Security: Not set (OK for dev mode)');
    }

    // Check Referrer Policy
    const referrer = res.headers['referrer-policy'];
    if (referrer) {
      console.log(`✅ Referrer-Policy: ${referrer}`);
    } else {
      console.log('❌ Referrer-Policy: MISSING');
    }

    console.log('\n🎉 Security headers test completed!');
  });

  req.on('error', (err) => {
    console.error('❌ Error testing security headers:', err.message);
    console.log('\n💡 Make sure the frontend development server is running on port 3000');
    console.log('   Run: cd frontend && npm run dev');
  });

  req.setTimeout(5000, () => {
    console.error('❌ Request timeout - make sure the server is running');
    req.destroy();
  });
}

testSecurityHeaders();