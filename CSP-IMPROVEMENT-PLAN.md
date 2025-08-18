# Content Security Policy (CSP) Improvement Plan

## Current Implementation
We have implemented a Content Security Policy with the following features:
- Added the required CSP header to all responses
- Added missing directives like `form-action`, `base-uri`, and `manifest-src`
- Added nonce generation for scripts and styles
- Set up a Docker entrypoint script to inject nonces into HTML content

## Limitations of Current Implementation
- Still using `'unsafe-inline'` for scripts and styles due to the React application's use of inline styles
- The nonce injection is a simple search-and-replace that may not catch all scripts and styles

## Future Improvements

### Short-term (1-3 months)
1. **Monitor CSP Reports**:
   - Add a `report-uri` directive to collect CSP violation reports
   - Set up a simple endpoint to receive and log these reports
   - Use these reports to identify missed resources and improve the policy

2. **Improve Nonce Implementation**:
   - Update the HTML processing to properly parse the DOM rather than using regex
   - Consider using a more robust tool for HTML modification like `htmlparser2`

### Mid-term (3-6 months)
1. **Move Inline Scripts to External Files**:
   - Identify all inline scripts in the application
   - Move them to external JavaScript files
   - Load these files with nonces

2. **Replace Inline Styles**:
   - Move inline styles to CSS classes
   - Use CSS modules or a similar approach to scope styles

3. **Add Hash-based Allowances**:
   - For any remaining inline scripts or styles that cannot be externalized
   - Calculate and add their SHA hashes to the CSP policy

### Long-term (6+ months)
1. **Remove 'unsafe-inline' Completely**:
   - Once all inline scripts and styles are properly handled with nonces or hashes
   - Remove the `'unsafe-inline'` directive from the CSP policy

2. **Implement Strict CSP**:
   - Add `'strict-dynamic'` to script-src
   - Implement Trusted Types policy
   - Consider adding `'require-trusted-types-for'` directive

3. **Regular Audit and Update**:
   - Periodically review and update the CSP policy
   - Remove unnecessary directives or sources
   - Keep up with CSP best practices and new features

## Resources
- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Google CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)