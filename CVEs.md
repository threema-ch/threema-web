When running `npm audit`, the report includes multiple published CVEs for
AngularJS. These vulnerabilities listed below don't affect Threema Web.

List of known AngularJS 1.8.x vulnerabilities, and whether or not they affect
Threema Web:

- **CVE-2022-25844 / GHSA-m2h2-264f-f486**
  - Denial of Service
  - <https://github.com/advisories/GHSA-m2h2-264f-f486>
  - <https://security.snyk.io/vuln/SNYK-JS-ANGULAR-2772735>
  - ✅ Threema Web not affected, we don't make use of `$locale.NUMBER_FORMATS` or `ctrl.posPre`
- **CVE-2022-25869 / GHSA-prc3-vjfx-vhm9**
  - Cross Site Scripting
  - <https://github.com/advisories/GHSA-prc3-vjfx-vhm9>
  - <https://nvd.nist.gov/vuln/detail/CVE-2022-25869>
  - <https://security.snyk.io/vuln/SNYK-JS-ANGULAR-2949781>
  - ✅ Exploits insecure page caching in Internet Explorer. Not relevant to Threema Web, since we don't support Internet Explorer.
- **CVE-2023-26116 / GHSA-2vrf-hf26-jrp5**
  - Denial of Service – angular.copy()
  - <https://github.com/advisories/GHSA-2vrf-hf26-jrp5>
  - <https://security.snyk.io/vuln/SNYK-JS-ANGULAR-3373044>
  - ✅ Threema Web not affected, we don't make use of `angular.copy`
- **CVE-2023-26117 / GHSA-2qqx-w9hr-q5gx**
  - Denial of Service – $resource service
  - <https://github.com/advisories/GHSA-2qqx-w9hr-q5gx>
  - <https://security.snyk.io/vuln/SNYK-JS-ANGULAR-3373045>
  - ✅ Threema Web not affected, we don't make use of `$resource`
- **CVE-2023-26118 / GHSA-qwqh-hm9m-p5hr**
  - Denial of Service – HTML input field
  - <https://github.com/advisories/GHSA-qwqh-hm9m-p5hr>
  - <https://security.snyk.io/vuln/SNYK-JS-ANGULAR-3373046>
  - ✅ Threema Web not affected, we don't make use of `<input type="url"`
- **CVE-2024-21490 / GHSA-4w4v-5hc9-xrr2**
  - BacktrackingCV
  - <https://github.com/advisories/GHSA-4w4v-5hc9-xrr2>
  - <https://nvd.nist.gov/vuln/detail/CVE-2024-21490>
  - <https://security.snyk.io/vuln/SNYK-JS-ANGULAR-6091113>
  - ✅ Threema Web not affected, we don't make use of `ng-srcset`
- **CVE-2024-8372 / GHSA-m9gf-397r-hwpg**
  - Image source restriction bypass
  - <https://github.com/advisories/GHSA-m9gf-397r-hwpg>
  - <https://nvd.nist.gov/vuln/detail/CVE-2024-8372>
  - <https://codepen.io/herodevs/full/xxoQRNL/0072e627abe03e9cda373bc75b4c1017>
  - ✅ Threema Web not affected, we don't make use of `imgSrcSanitization`
- **CVE-2024-8373 / GHSA-mqm9-c95h-x2p6**
  - Image source restriction bypass
  - <https://github.com/advisories/GHSA-mqm9-c95h-x2p6>
  - <https://nvd.nist.gov/vuln/detail/CVE-2024-8373>
  - <https://security.snyk.io/vuln/SNYK-DEBIANUNSTABLE-ANGULARJS-7931629>
  - <https://codepen.io/herodevs/full/bGPQgMp/8da9ce87e99403ee13a295c305ebfa0b>
  - ✅ Threema Web not affected, we don't make use of `imgSrcSanitization`
- **CVE-2025-0716 / GHSA-j58c-ww9w-pwp5**
  - Improper SVG sanitization
  - <https://github.com/advisories/GHSA-j58c-ww9w-pwp5>
  - ✅ Threema Web not affected. All user-provided content is HTML-escaped (via the `escapeHtml` filter) before it is passed to `ng-bind-html` / `$sanitize`, so attacker-controlled SVG markup never reaches the sanitizer as live markup. In addition, SVG support in `$sanitize` is not enabled (we don't call `$sanitizeProvider.enableSvg()`), so SVG elements are stripped regardless, and we only render static, bundled SVG assets (emoji, icons), and never external or user-provided SVG.
- **CVE-2025-2336 / GHSA-4p4w-6hg8-63wx**
  - Improper SVG sanitization
  - <https://github.com/advisories/GHSA-4p4w-6hg8-63wx>
  - ✅ Same rationale as for CVE-2025-0716
