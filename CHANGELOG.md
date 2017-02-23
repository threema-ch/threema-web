# Threema Web Changelog

### [v1.0.3][v1.0.3] (2017-02-23)

* [feature] Autofocus on compose area when opening a conversation ([#41][i41])
* [feature] Create unique file names for downloaded files / images ([#61][i61])
* [feature] Add support for pasting data into compose area ([#82][i82])
* [feature] Split up messages that are too long into multiple messages ([#48][i48] / [#79][i79])
* [bug] Fix for some "stuck at 60%" problems (add support for TURN via TCP) ([#43][i43] / [#83][i83])
* [bug] Fix for some "stuck at 99%" problems ([#38][i38])
* [bug] Fix display of untranslated strings in dialogs ([#57][i57])
* [bug] Fix display of very long file names ([#69][i69])

### [v1.0.2][v1.0.2] (2017-02-21)

* [feature] Add loading indicator when sending files (#29)
* [feature] Add warning about browser plugins if PeerConnection setup fails (#46)
* [feature] Add referrer policy tag to HTML (#49)
* [feature] Add reload button to error page (#66)
* [feature] Add warning message if browser blocks local storage (#67)
* [bug] Fix pasting of HTML code that could lead to a potential XSS
  vulnerability (thanks [Frederik Braun](https://github.com/freddyb) for reporting)
* [bug] Fix some translations

### v1.0.1 (2017-02-15)

First public release.


[i38]: https://github.com/threema-ch/threema-web/issues/38
[i41]: https://github.com/threema-ch/threema-web/issues/41
[i43]: https://github.com/threema-ch/threema-web/issues/43
[i48]: https://github.com/threema-ch/threema-web/issues/48
[i57]: https://github.com/threema-ch/threema-web/issues/57
[i61]: https://github.com/threema-ch/threema-web/issues/61
[i69]: https://github.com/threema-ch/threema-web/issues/69
[i79]: https://github.com/threema-ch/threema-web/issues/79
[i82]: https://github.com/threema-ch/threema-web/issues/82
[i83]: https://github.com/threema-ch/threema-web/issues/83

[v1.0.3]: https://github.com/threema-ch/threema-web/compare/v1.0.2...v1.0.3
[v1.0.2]: https://github.com/threema-ch/threema-web/compare/v1.0.1...v1.0.2
