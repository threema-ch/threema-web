# Threema Web Changelog

This changelog lists the most important changes for each released version. For
the full log, please refer to the git commit history.

### [v1.0.4][v1.0.4] (2017-03-01)

* [feature] Enable support for TURN via TLS (except for FF <53) ([#43][i43] / [#109][i109])
* [feature] Add noscript warning ([#119][i119])
* [bug] Fix compatibility bug for older browsers ([#64][i64])
* [bug] Escape all pasted text in compose area ([#86][i86])
* [bug] Update unread count in title on initial loading ([#93][i93])
* [bug] Fix state transitions when restoring a session ([#102][i102])
* [bug] Improve performance / reduce CPU load ([#117][i117] / [#20][i20] / [#39][i39])

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

* [feature] Add loading indicator when sending files ([#29][i29])
* [feature] Add warning about browser plugins if PeerConnection setup fails ([#46][i46])
* [feature] Add referrer policy tag to HTML ([#49][i49])
* [feature] Add reload button to error page ([#66][i66])
* [feature] Add warning message if browser blocks local storage ([#67][i67])
* [bug] Fix pasting of HTML code that could lead to a potential XSS
  vulnerability (thanks [Frederik Braun](https://github.com/freddyb) for reporting)
* [bug] Fix some translations

### v1.0.1 (2017-02-15)

First public release.

[i20]: https://github.com/threema-ch/threema-web/issues/20
[i29]: https://github.com/threema-ch/threema-web/issues/29
[i38]: https://github.com/threema-ch/threema-web/issues/38
[i39]: https://github.com/threema-ch/threema-web/issues/39
[i41]: https://github.com/threema-ch/threema-web/issues/41
[i43]: https://github.com/threema-ch/threema-web/issues/43
[i46]: https://github.com/threema-ch/threema-web/issues/46
[i48]: https://github.com/threema-ch/threema-web/issues/48
[i49]: https://github.com/threema-ch/threema-web/issues/49
[i57]: https://github.com/threema-ch/threema-web/issues/57
[i61]: https://github.com/threema-ch/threema-web/issues/61
[i64]: https://github.com/threema-ch/threema-web/issues/64
[i66]: https://github.com/threema-ch/threema-web/issues/66
[i67]: https://github.com/threema-ch/threema-web/issues/67
[i69]: https://github.com/threema-ch/threema-web/issues/69
[i79]: https://github.com/threema-ch/threema-web/issues/79
[i82]: https://github.com/threema-ch/threema-web/issues/82
[i83]: https://github.com/threema-ch/threema-web/issues/83
[i86]: https://github.com/threema-ch/threema-web/issues/86
[i93]: https://github.com/threema-ch/threema-web/issues/93
[i102]: https://github.com/threema-ch/threema-web/issues/102
[i109]: https://github.com/threema-ch/threema-web/issues/109
[i117]: https://github.com/threema-ch/threema-web/issues/117
[i119]: https://github.com/threema-ch/threema-web/issues/119

[v1.0.4]: https://github.com/threema-ch/threema-web/compare/v1.0.3...v1.0.4
[v1.0.3]: https://github.com/threema-ch/threema-web/compare/v1.0.2...v1.0.3
[v1.0.2]: https://github.com/threema-ch/threema-web/compare/v1.0.1...v1.0.2
