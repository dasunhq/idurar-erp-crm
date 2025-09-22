#!/bin/bash

# This script processes HTML files and injects a CSP nonce
# It's meant to be run as part of the nginx startup

# Generate a random nonce
NONCE=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

# Replace {{NONCE}} placeholder in nginx configuration files with the generated nonce
sed -i "s/{{NONCE}}/$NONCE/g" /etc/nginx/conf.d/http-headers.conf
sed -i "s/{{NONCE}}/$NONCE/g" /etc/nginx/conf.d/default.conf

# Process HTML files in the nginx root directory to add nonces to scripts and styles
find /usr/share/nginx/html -type f -name "*.html" -exec sed -i "s/<script/<script nonce=\"$NONCE\"/g" {} \;
find /usr/share/nginx/html -type f -name "*.html" -exec sed -i "s/<style/<style nonce=\"$NONCE\"/g" {} \;

# Also handle link tags for stylesheets
find /usr/share/nginx/html -type f -name "*.html" -exec sed -i "s/<link rel=\"stylesheet\"/<link rel=\"stylesheet\" nonce=\"$NONCE\"/g" {} \;
find /usr/share/nginx/html -type f -name "*.html" -exec sed -i "s/<link rel='stylesheet'/<link rel='stylesheet' nonce=\"$NONCE\"/g" {} \;
find /usr/share/nginx/html -type f -name "*.html" -exec sed -i "s/<link href=\".*\.css\"/<link href=\"&\" nonce=\"$NONCE\"/g" {} \;

echo "Generated CSP nonce: $NONCE"
echo "CSP headers configured and nonces added to HTML files"

# Start nginx
exec nginx -g 'daemon off;'