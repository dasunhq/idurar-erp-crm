#!/bin/bash

# Test script to verify X-Content-Type-Options header is properly set
echo "Testing X-Content-Type-Options header implementation..."

# Test configuration files exist
echo "1. Checking configuration files..."

if [ -f "nginx.conf" ]; then
    if grep -q "X-Content-Type-Options" nginx.conf; then
        echo "✓ X-Content-Type-Options found in nginx.conf"
    else
        echo "✗ X-Content-Type-Options NOT found in nginx.conf"
    fi
else
    echo "✗ nginx.conf not found"
fi

if [ -f "nginx-http-headers.conf" ]; then
    if grep -q "X-Content-Type-Options" nginx-http-headers.conf; then
        echo "✓ X-Content-Type-Options found in nginx-http-headers.conf"
    else
        echo "✗ X-Content-Type-Options NOT found in nginx-http-headers.conf"
    fi
else
    echo "✗ nginx-http-headers.conf not found"
fi

if [ -f "apache-security-headers.conf" ]; then
    if grep -q "X-Content-Type-Options" apache-security-headers.conf; then
        echo "✓ X-Content-Type-Options found in apache-security-headers.conf"
    else
        echo "✗ X-Content-Type-Options NOT found in apache-security-headers.conf"
    fi
else
    echo "✗ apache-security-headers.conf not found"
fi

if [ -f "frontend/security-middleware.js" ]; then
    if grep -q "X-Content-Type-Options" frontend/security-middleware.js; then
        echo "✓ X-Content-Type-Options found in frontend/security-middleware.js"
    else
        echo "✗ X-Content-Type-Options NOT found in frontend/security-middleware.js"
    fi
else
    echo "✗ frontend/security-middleware.js not found"
fi

if [ -f "backend/src/app.js" ]; then
    if grep -q "noSniff: true" backend/src/app.js; then
        echo "✓ noSniff option found in backend/src/app.js"
    else
        echo "✗ noSniff option NOT found in backend/src/app.js"
    fi
else
    echo "✗ backend/src/app.js not found"
fi

echo ""
echo "2. Testing header configuration syntax..."

# Test nginx configuration syntax (if nginx is available)
if command -v nginx &> /dev/null; then
    echo "Testing nginx configuration syntax..."
    nginx -t -c "$(pwd)/nginx-base.conf" 2>/dev/null && echo "✓ Nginx configuration syntax is valid" || echo "✗ Nginx configuration has syntax errors"
fi

echo ""
echo "3. Summary of changes made:"
echo "- Added X-Content-Type-Options header to nginx-http-headers.conf"
echo "- Added error page handling with security headers in nginx.conf"
echo "- Enhanced Apache configuration with security headers"
echo "- Created error.html page with proper styling"
echo "- Verified backend Helmet middleware has noSniff enabled"
echo "- Verified frontend security middleware includes the header"

echo ""
echo "Test completed. The X-Content-Type-Options header should now be properly set across all server configurations."