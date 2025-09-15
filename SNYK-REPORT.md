# Snyk Security Report - October 3rd, 2025

## Report Summary
- **Date**: October 3rd, 2025, 5:57:08 PM (UTC+00:00)
- **Total Vulnerabilities**: 5 known vulnerabilities
- **Vulnerable Paths**: 5 vulnerable dependency paths
- **Total Dependencies**: 761 dependencies

## Scan Results

### Remaining Vulnerabilities (Unfixable)

#### 1. Predictable Value Range from Previous Values
- **Severity**: Critical
- **Module**: form-data@2.3.3 (in html-pdf dependency chain)
- **Path**: idurar-erp-crm@4.1.0 › html-pdf@3.0.1 › phantomjs-prebuilt@2.1.16 › request@2.88.2 › form-data@2.3.3
- **Status**: Cannot be fixed without breaking html-pdf functionality
- **Reason**: html-pdf is deprecated and uses outdated dependencies

#### 2. Prototype Pollution
- **Severity**: Medium
- **Module**: tough-cookie@2.5.0 (in html-pdf dependency chain)
- **Path**: idurar-erp-crm@4.1.0 › html-pdf@3.0.1 › phantomjs-prebuilt@2.1.16 › request@2.88.2 › tough-cookie@2.5.0
- **Status**: Cannot be fixed without breaking html-pdf functionality
- **Reason**: html-pdf is deprecated and uses outdated dependencies

#### 3. Server-side Request Forgery (SSRF)
- **Severity**: Medium
- **Module**: request@2.88.2 (in html-pdf dependency chain)
- **Path**: idurar-erp-crm@4.1.0 › html-pdf@3.0.1 › phantomjs-prebuilt@2.1.16 › request@2.88.2
- **Status**: Cannot be fixed - request package is deprecated
- **Reason**: No fix available, request package deprecated

#### 4. Arbitrary File Upload (Type 1)
- **Severity**: Medium
- **Module**: express-fileupload@1.4.3
- **Path**: idurar-erp-crm@4.1.0 › express-fileupload@1.4.3
- **Status**: No fixed version available
- **Note**: Maintainers dispute vulnerability as normal package behavior

#### 5. Arbitrary File Upload (Type 2)
- **Severity**: Medium
- **Module**: express-fileupload@1.4.3
- **Path**: idurar-erp-crm@4.1.0 › express-fileupload@1.4.3
- **Status**: No fixed version available
- **Impact**: File overwrite vulnerability when multiple files have same name

## Mitigation Strategies

### For html-pdf Related Vulnerabilities
- **Current Status**: All vulnerabilities stem from deprecated html-pdf package
- **Recommendation**: Consider migrating to modern alternatives:
  - Puppeteer for PDF generation
  - Playwright for PDF generation
  - @sparticuz/chromium for serverless environments

### For express-fileupload Vulnerabilities
- **Current Status**: Project already uses multer@2.0.2 as alternative
- **Recommendation**: 
  - Migrate all file upload functionality to multer
  - Remove express-fileupload dependency
  - Implement proper file validation and sanitization

## Previous Fixes Applied (September 14th, 2025)

The following vulnerabilities were successfully fixed in the previous security update:
- 19+ vulnerabilities across backend and frontend
- Major framework updates (Express, Axios, Mongoose, etc.)
- Multiple XSS, ReDoS, and injection vulnerabilities resolved

## Risk Assessment

### High Risk Items
1. **html-pdf dependency chain** - Multiple critical/medium vulnerabilities in deprecated packages
2. **express-fileupload** - File upload vulnerabilities with no available fixes

### Medium Risk Items
1. **Legacy PDF generation** - Functionality depends on vulnerable packages
2. **Dual file upload systems** - Using both multer and express-fileupload

## Recommendations

### Immediate Actions
1. **Audit PDF Generation Usage**: Identify all code using html-pdf
2. **File Upload Audit**: Identify all code using express-fileupload
3. **Plan Migration**: Develop timeline for replacing vulnerable packages

### Long-term Actions
1. **Replace html-pdf**: Migrate to Puppeteer or similar modern solution
2. **Remove express-fileupload**: Consolidate to multer-only file handling
3. **Implement CSP**: Content Security Policy for additional XSS protection
4. **Regular Security Scans**: Automated Snyk monitoring setup

## Conclusion

While 5 vulnerabilities remain, they are all in deprecated packages (html-pdf chain) or packages with disputed/unfixed issues (express-fileupload). The application has been significantly hardened through the September 2025 security fixes, addressing the most critical and easily-fixable vulnerabilities.

The remaining vulnerabilities require architectural changes rather than simple dependency updates, which should be planned as part of a broader modernization effort.