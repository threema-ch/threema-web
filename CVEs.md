When running `npm audit`, the report includes multiple published CVEs for
AngularJS. These vulnerabilities don't affect Threema Web.

List of known AngularJS 1.8.x vulnerabilities, and whether or not they affect
Threema Web:

- **CVE-2023-26117**
  - Denial of Service – $resource service
  - <https://github.com/advisories/GHSA-2qqx-w9hr-q5gx>
  - <https://security.snyk.io/vuln/SNYK-JS-ANGULAR-3373045>
  - ✅ Threema Web not affected, we don't make use of `$resource`
- **CVE-2023-26116**
  - Denial of Service – angular.copy()
  - <https://github.com/advisories/GHSA-2vrf-hf26-jrp5>
  - <https://security.snyk.io/vuln/SNYK-JS-ANGULAR-3373044>
  - ✅ Threema Web not affected, we don't make use of `angular.copy`
- **CVE-2023-26118**
  - Denial of Service – HTML input field
  - <https://security.snyk.io/vuln/SNYK-JS-ANGULAR-3373046>
  - ✅ Threema Web not affected, we don't make use of `<input type="url"`
- **CVE-2022-25844**
  - Denial of Service
  - <https://security.snyk.io/vuln/SNYK-JS-ANGULAR-2772735>
  - ✅ Threema Web not affected, we don't make use of `$locale.NUMBER_FORMATS` or `ctrl.posPre`
- **CVE-2022-25869**
  - Cross Site Scripting
  - <https://nvd.nist.gov/vuln/detail/CVE-2022-25869>
  - <https://security.snyk.io/vuln/SNYK-JS-ANGULAR-2949781>
  - ✅ Exploits insecure page caching in Internet Explorer. Not relevant to Threema Web, since we don't support Internet Explorer.
- **CVE-2024-8373**
  - Image source restriction bypass
  - <https://nvd.nist.gov/vuln/detail/CVE-2024-8373>
  - <https://security.snyk.io/vuln/SNYK-DEBIANUNSTABLE-ANGULARJS-7931629>
  - <https://codepen.io/herodevs/full/bGPQgMp/8da9ce87e99403ee13a295c305ebfa0b>
  - ✅ Threema Web not affected, we don't make use of `imgSrcSanitization`
- **CVE-2023-8372**
  - Image source restriction bypass
  - <https://nvd.nist.gov/vuln/detail/CVE-2024-8372>
  - <https://codepen.io/herodevs/full/xxoQRNL/0072e627abe03e9cda373bc75b4c1017>
  - ✅ Threema Web not affected, we don't make use of `imgSrcSanitization`
- **CVE-2024-21490**
  - BacktrackingCV
  - <https://nvd.nist.gov/vuln/detail/CVE-2024-21490>
  - <https://security.snyk.io/vuln/SNYK-JS-ANGULAR-6091113>
  - ✅ Threema Web not affected, we don't make use of `ng-srcset`
- **CVE-2025-0716**
  - Improper SVG sanitization
  - <https://github.com/advisories/GHSA-j58c-ww9w-pwp5>
  - ✅ Threema Web not affected, we don't use `image` tags in SVG and don't render external SVG files
