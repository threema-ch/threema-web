# Threema Web Changelog

This changelog lists the most important changes for each released version. For
the full log, please refer to the git commit history.

### [v1.7.0][v1.7.0] (2017-11-27)

Changes:

* [feature] Upgrade to Emojione 3.1 / Unicode 10.0 ([#373][i373])
* [feature] Warn if other tabs use the same session ([#369][i369])
* [bug] Fix QR code content in "my identity" view ([#365][i365])
* [bug] Fix missing caret between emoji in Firefox ([#374][i374])
* [bug] Fix multiple issues with compose area and drafts ([#376][i376] / [#380][i380] / [#382][i382])
* [bug] Fix citation text overflow ([#378][i378])
* [bug] Don't fade battery icon when charging ([#372][i372])
* [bug] Fix bottom border for marked / unread conversations ([#366][i366])
* [bug] Harmonize status icons ([#345][i345] / [#385][i385])
* [change] Link to changelog from version update alert dialog ([#363][i363])
* [change] Improve troubleshooting tool ([#364][i364])
* [change] Use powershell to run `package.sh` on Windows ([#371][i371])

Contributors:

* [@bluec0re][@bluec0re]
* [@lgrahl][@lgrahl]
* [@Octoate][@Octoate]

### [v1.6.2][v1.6.2] (2017-10-25)

Changes:

* [feature] Do not trigger notifications for muted conversations ([#357][i357])
* [feature] Show indicator for muted conversations ([#357][i357])
* [feature] Implement display of starred conversations ([#362][i362])
* [bug] Fix centering of caption text ([#352][i352])
* [bug] Don't display low battery notification when charging ([#359][i359])
* [bug] Fix image upload for avatar editor ([#358][i358])

### [v1.6.1][v1.6.1] (2017-10-02)

Changes:

* [feature] Show desktop notifications if battery level is low ([#351][i351])
* [change] Updated STUN/TURN endpoints

### [v1.6.0][v1.6.0] (2017-09-26)

Changes:

* [feature] Deal with unknown message types ([#311][i311])
* [feature] Focus input field after sending message ([#316][i316])
* [feature] Add file message preview in conversations list ([#315][i315])
* [feature] Show group creation and member count in group detail view ([#255][i255])
* [feature] Mark blocked contacts / disable sending messages to blocked contacts ([#135][i135])
* [feature] Implement deleting all messages of a chat ([#50][i50])
* [feature] Emojify nicknames ([#338][i338])
* [feature] Add mechanisms to improve protocol version upgrades ([#339][i339])
* [feature] Battery status improvements ([#340][i340])
* [bug] Do not allow ack/dec on voip status messages ([#320][i320])
* [bug] Fix missing translation in notification of voip status messages ([#321][i321])
* [bug] Show downloading indicator on downloading a message via menu ([#334][i334])
* [bug] Fix sending multiple files via attachment button ([#330][i330])
* [bug] Show caption input only on file and image messages ([#332][i332])
* [bug] Focus compose area on quoting a text ([#251][i251])
* [change] Limit image caption text characters ([#343][i343])
* [change] Don't reload data on ICE reconnect ([#349][i349])
* [change] Updated STUN/TURN endpoints

Contributors:

- [@JlnWntr][@JlnWntr]

### [v1.5.0][v1.5.0] (2017-08-29)

Changes:

* [feature] Mark Threema Work users with a suitcase icon ([#310][i310])
* [feature] Show nickname for verified contacts and in contact details ([#296][i296])
* [bug] Fix quote preview not updating when changing quote ([#281][i281])
* [bug] Auto focus input field on creating a new receiver ([#289][i289])
* [bug] Show voip status messages in the navigation view ([#291][i291])
* [change] Put unread count in window title as first element ([#285][i285])

Contributors:

- [@IndianaDschones][@IndianaDschones]

### [v1.4.1][v1.4.1] (2017-08-07)

Changes:

* [feature] Implement display of VoIP message types ([#282][i282])
* [feature] Make it possible to save new contacts / groups / distribution lists
  with enter key ([#271][i271])
* [change] Make battery icon unselectable ([#275][i275])

Contributors:

- [@IndianaDschones][@IndianaDschones]
- [@rugk][@rugk]

### [v1.4.0][v1.4.0] (2017-07-20)

Changes:

* [feature] Show battery status indicator ([#265][i265])
* [change] Reduce browser CPU usage in conversation ([#264][i264])
* [bug] Add high DPI versions of emoji spritemaps ([#261][i261])

### [v1.3.1][v1.3.1] (2017-06-22)

Changes:

* [bug] Fix bug when inserting emoji in Chrome ([#256][i256])

### [v1.3.0][v1.3.0] (2017-06-22)

Changes:

* [feature] Upgrade to Emojione 3 ([#54][i54] / [#201][i201])
* [feature] Support emoji in conversation and contact names ([#44][i44])
* [feature] Fallback text in user profile if first/last name are not provided ([#238][i238])
* [bug] Make it impossible to open own contact ([#231][i231] / [#235][i235])
* [bug] When pasting text, only trim newline characters ([#237][i237])
* [bug] Fix right-to-left support ([#239][i239])

### [v1.2.1][v1.2.1] (2017-05-17)

Changes:

* [feature] Check for a new version, notify user if version changed ([#183][i183])
* [bug] Fix line breaks when pasting on Windows ([#134][i134])
* [bug] Fix path to sound notification file

### [v1.2.0][v1.2.0] (2017-05-17)

Changes:

* [feature] Support markup and emoji in media box caption ([#177][i177])
* [feature] Optional notification sound for incoming messages ([#178][i178])
* [feature] Consider page visibility when marking messages as read ([#17][i17] / [#108][i108] / [#211][i211])
* [feature] Support all threema url actions ([#190][i190] / [#215][i215])
* [change] Location message redesign ([#185][i185])
* [change] Enhanced desktop notification preview ([#193][i193])
* [bug] Enforce text cursor on compose box ([#204][i204])
* [bug] Fix resizing behavior of back arrow button ([#205][i205])
* [bug] Fix displaying of drafts in active conversation ([#189][i189])
* [bug] Fix MIME type handling ([#90][i90] / [#59][i59] / [#202][i202])

Contributors:

- [@IndianaDschones][@IndianaDschones]
- [@Pythonix][@Pythonix]
- [@econic][@econic]

### [v1.1.0][v1.1.0] (2017-03-16)

Changes:

* [feature] Make notification settings configurable ([#8][i8])
* [feature] Image preview ([#11][i11])
* [feature] Show group members in header ([#6][i6])
* [feature] Check for desktop notifications in troubleshooting tool ([#150][i150])
* [change] Immediately hide desktop notifications for read conversations ([#131][i131])
* [change] Make scrollbars in Chrome a bit wider ([#144][i144])
* [change] Increment minimal required FF version to 50 ([#161][i161])
* [bug] Fix / improve soft reconnect behavior ([#167][i167])
* [bug] Fix flickering of avatars on refresh ([#143][i143])
* [bug] Fix submitting of files with enter key ([#122][i122])
* [bug] Reset unread count after logout ([#148][i148])
* [bug] Fix TypeError when closing a dialog ([#153][i153])
* [bug] Stop supporting multi-line markup ([#156][i156])

Contributors:

* [@IndianaDschones][@IndianaDschones]
* [@FloThinksPi][@FloThinksPi]

### [v1.0.5][v1.0.5] (2017-03-03)

Changes:

* [feature] Add diagnostics/troubleshooting page ([#126][i126] / [#127][i127])
* [bug] Fix bug resulting in slow initial load ([#120][i120])
* [bug] Add meta description to index.html ([#124][i124])

### [v1.0.4][v1.0.4] (2017-03-01)

Changes:

* [feature] Enable support for TURN via TLS (except for FF <53) ([#43][i43] / [#109][i109])
* [feature] Add noscript warning ([#119][i119])
* [bug] Fix compatibility bug for older browsers ([#64][i64])
* [bug] Escape all pasted text in compose area ([#86][i86])
* [bug] Update unread count in title on initial loading ([#93][i93])
* [bug] Fix state transitions when restoring a session ([#102][i102])
* [bug] Improve performance / reduce CPU load ([#117][i117] / [#20][i20] / [#39][i39])

Contributors:

- [@N3dal][@N3dal]
- [@ovalseven8][@ovalseven8]
- [@rugk][@rugk]

### [v1.0.3][v1.0.3] (2017-02-23)

Changes:

* [feature] Autofocus on compose area when opening a conversation ([#41][i41])
* [feature] Create unique file names for downloaded files / images ([#61][i61])
* [feature] Add support for pasting data into compose area ([#82][i82])
* [feature] Split up messages that are too long into multiple messages ([#48][i48] / [#79][i79])
* [bug] Fix for some "stuck at 60%" problems (add support for TURN via TCP) ([#43][i43] / [#83][i83])
* [bug] Fix for some "stuck at 99%" problems ([#38][i38])
* [bug] Fix display of untranslated strings in dialogs ([#57][i57])
* [bug] Fix display of very long file names ([#69][i69])

Contributors:

* [@thommy101][@thommy101]
* [@lgrahl][@lgrahl]


### [v1.0.2][v1.0.2] (2017-02-21)

Changes:

* [feature] Add loading indicator when sending files ([#29][i29])
* [feature] Add warning about browser plugins if PeerConnection setup fails ([#46][i46])
* [feature] Add referrer policy tag to HTML ([#49][i49])
* [feature] Add reload button to error page ([#66][i66])
* [feature] Add warning message if browser blocks local storage ([#67][i67])
* [bug] Fix pasting of HTML code that could lead to a potential XSS
  vulnerability (thanks [Frederik Braun](https://github.com/freddyb) for reporting)
* [bug] Fix some translations

Contributors:

* [@rugk][@rugk]
* [@Mic92][@Mic92]
* [@freddyb][@freddyb]


### v1.0.1 (2017-02-15)

First public release.

[i6]: https://github.com/threema-ch/threema-web/issues/6
[i8]: https://github.com/threema-ch/threema-web/issues/8
[i11]: https://github.com/threema-ch/threema-web/issues/11
[i17]: https://github.com/threema-ch/threema-web/issues/17
[i20]: https://github.com/threema-ch/threema-web/issues/20
[i29]: https://github.com/threema-ch/threema-web/issues/29
[i38]: https://github.com/threema-ch/threema-web/issues/38
[i39]: https://github.com/threema-ch/threema-web/issues/39
[i41]: https://github.com/threema-ch/threema-web/issues/41
[i43]: https://github.com/threema-ch/threema-web/issues/43
[i44]: https://github.com/threema-ch/threema-web/issues/44
[i46]: https://github.com/threema-ch/threema-web/issues/46
[i48]: https://github.com/threema-ch/threema-web/issues/48
[i49]: https://github.com/threema-ch/threema-web/issues/49
[i50]: https://github.com/threema-ch/threema-web/issues/50
[i54]: https://github.com/threema-ch/threema-web/issues/54
[i57]: https://github.com/threema-ch/threema-web/issues/57
[i59]: https://github.com/threema-ch/threema-web/issues/59
[i61]: https://github.com/threema-ch/threema-web/issues/61
[i64]: https://github.com/threema-ch/threema-web/issues/64
[i66]: https://github.com/threema-ch/threema-web/issues/66
[i67]: https://github.com/threema-ch/threema-web/issues/67
[i69]: https://github.com/threema-ch/threema-web/issues/69
[i79]: https://github.com/threema-ch/threema-web/issues/79
[i82]: https://github.com/threema-ch/threema-web/issues/82
[i83]: https://github.com/threema-ch/threema-web/issues/83
[i86]: https://github.com/threema-ch/threema-web/issues/86
[i90]: https://github.com/threema-ch/threema-web/issues/90
[i93]: https://github.com/threema-ch/threema-web/issues/93
[i102]: https://github.com/threema-ch/threema-web/issues/102
[i108]: https://github.com/threema-ch/threema-web/issues/108
[i109]: https://github.com/threema-ch/threema-web/issues/109
[i117]: https://github.com/threema-ch/threema-web/issues/117
[i119]: https://github.com/threema-ch/threema-web/issues/119
[i120]: https://github.com/threema-ch/threema-web/issues/120
[i122]: https://github.com/threema-ch/threema-web/issues/122
[i124]: https://github.com/threema-ch/threema-web/issues/124
[i126]: https://github.com/threema-ch/threema-web/issues/126
[i127]: https://github.com/threema-ch/threema-web/issues/127
[i131]: https://github.com/threema-ch/threema-web/issues/131
[i134]: https://github.com/threema-ch/threema-web/issues/134
[i135]: https://github.com/threema-ch/threema-web/issues/135
[i143]: https://github.com/threema-ch/threema-web/issues/143
[i144]: https://github.com/threema-ch/threema-web/issues/144
[i148]: https://github.com/threema-ch/threema-web/issues/148
[i150]: https://github.com/threema-ch/threema-web/issues/150
[i153]: https://github.com/threema-ch/threema-web/issues/153
[i156]: https://github.com/threema-ch/threema-web/issues/156
[i161]: https://github.com/threema-ch/threema-web/issues/161
[i167]: https://github.com/threema-ch/threema-web/issues/167
[i177]: https://github.com/threema-ch/threema-web/issues/177
[i178]: https://github.com/threema-ch/threema-web/issues/178
[i183]: https://github.com/threema-ch/threema-web/issues/183
[i185]: https://github.com/threema-ch/threema-web/issues/185
[i189]: https://github.com/threema-ch/threema-web/issues/189
[i190]: https://github.com/threema-ch/threema-web/issues/190
[i193]: https://github.com/threema-ch/threema-web/issues/193
[i201]: https://github.com/threema-ch/threema-web/issues/201
[i202]: https://github.com/threema-ch/threema-web/issues/202
[i204]: https://github.com/threema-ch/threema-web/issues/204
[i205]: https://github.com/threema-ch/threema-web/issues/205
[i211]: https://github.com/threema-ch/threema-web/issues/211
[i215]: https://github.com/threema-ch/threema-web/issues/215
[i231]: https://github.com/threema-ch/threema-web/issues/231
[i235]: https://github.com/threema-ch/threema-web/issues/235
[i237]: https://github.com/threema-ch/threema-web/issues/237
[i238]: https://github.com/threema-ch/threema-web/issues/238
[i239]: https://github.com/threema-ch/threema-web/issues/239
[i251]: https://github.com/threema-ch/threema-web/issues/251
[i255]: https://github.com/threema-ch/threema-web/issues/255
[i256]: https://github.com/threema-ch/threema-web/issues/256
[i261]: https://github.com/threema-ch/threema-web/issues/261
[i264]: https://github.com/threema-ch/threema-web/issues/264
[i265]: https://github.com/threema-ch/threema-web/issues/265
[i271]: https://github.com/threema-ch/threema-web/issues/271
[i275]: https://github.com/threema-ch/threema-web/issues/275
[i281]: https://github.com/threema-ch/threema-web/issues/281
[i282]: https://github.com/threema-ch/threema-web/issues/282
[i285]: https://github.com/threema-ch/threema-web/issues/285
[i289]: https://github.com/threema-ch/threema-web/issues/289
[i291]: https://github.com/threema-ch/threema-web/issues/291
[i296]: https://github.com/threema-ch/threema-web/issues/296
[i310]: https://github.com/threema-ch/threema-web/issues/310
[i311]: https://github.com/threema-ch/threema-web/issues/311
[i315]: https://github.com/threema-ch/threema-web/issues/315
[i316]: https://github.com/threema-ch/threema-web/issues/316
[i320]: https://github.com/threema-ch/threema-web/issues/320
[i330]: https://github.com/threema-ch/threema-web/issues/330
[i321]: https://github.com/threema-ch/threema-web/issues/321
[i332]: https://github.com/threema-ch/threema-web/issues/332
[i334]: https://github.com/threema-ch/threema-web/issues/334
[i338]: https://github.com/threema-ch/threema-web/issues/338
[i339]: https://github.com/threema-ch/threema-web/issues/339
[i340]: https://github.com/threema-ch/threema-web/issues/340
[i343]: https://github.com/threema-ch/threema-web/issues/343
[i345]: https://github.com/threema-ch/threema-web/issues/345
[i349]: https://github.com/threema-ch/threema-web/issues/349
[i351]: https://github.com/threema-ch/threema-web/issues/351
[i352]: https://github.com/threema-ch/threema-web/issues/352
[i357]: https://github.com/threema-ch/threema-web/issues/357
[i358]: https://github.com/threema-ch/threema-web/issues/358
[i359]: https://github.com/threema-ch/threema-web/issues/359
[i362]: https://github.com/threema-ch/threema-web/issues/362
[i363]: https://github.com/threema-ch/threema-web/issues/363
[i364]: https://github.com/threema-ch/threema-web/issues/364
[i365]: https://github.com/threema-ch/threema-web/issues/365
[i366]: https://github.com/threema-ch/threema-web/issues/366
[i369]: https://github.com/threema-ch/threema-web/issues/369
[i371]: https://github.com/threema-ch/threema-web/issues/371
[i372]: https://github.com/threema-ch/threema-web/issues/372
[i373]: https://github.com/threema-ch/threema-web/issues/373
[i374]: https://github.com/threema-ch/threema-web/issues/374
[i376]: https://github.com/threema-ch/threema-web/issues/376
[i378]: https://github.com/threema-ch/threema-web/issues/378
[i380]: https://github.com/threema-ch/threema-web/issues/380
[i382]: https://github.com/threema-ch/threema-web/issues/382
[i385]: https://github.com/threema-ch/threema-web/issues/385

[v1.7.0]: https://github.com/threema-ch/threema-web/compare/v1.6.2...v1.7.0
[v1.6.2]: https://github.com/threema-ch/threema-web/compare/v1.6.1...v1.6.2
[v1.6.1]: https://github.com/threema-ch/threema-web/compare/v1.6.0...v1.6.1
[v1.6.0]: https://github.com/threema-ch/threema-web/compare/v1.5.0...v1.6.0
[v1.5.0]: https://github.com/threema-ch/threema-web/compare/v1.4.1...v1.5.0
[v1.4.1]: https://github.com/threema-ch/threema-web/compare/v1.4.0...v1.4.1
[v1.4.0]: https://github.com/threema-ch/threema-web/compare/v1.3.1...v1.4.0
[v1.3.1]: https://github.com/threema-ch/threema-web/compare/v1.3.0...v1.3.1
[v1.3.0]: https://github.com/threema-ch/threema-web/compare/v1.2.1...v1.3.0
[v1.2.1]: https://github.com/threema-ch/threema-web/compare/v1.2.0...v1.2.1
[v1.2.0]: https://github.com/threema-ch/threema-web/compare/v1.1.0...v1.2.0
[v1.1.0]: https://github.com/threema-ch/threema-web/compare/v1.0.5...v1.1.0
[v1.0.5]: https://github.com/threema-ch/threema-web/compare/v1.0.4...v1.0.5
[v1.0.4]: https://github.com/threema-ch/threema-web/compare/v1.0.3...v1.0.4
[v1.0.3]: https://github.com/threema-ch/threema-web/compare/v1.0.2...v1.0.3
[v1.0.2]: https://github.com/threema-ch/threema-web/compare/v1.0.1...v1.0.2

[@rugk]: https://github.com/rugk/
[@Mic92]: https://github.com/Mic92/
[@freddyb]: https://github.com/freddyb/
[@thommy101]: https://github.com/thommy101/
[@lgrahl]: https://github.com/lgrahl/
[@N3dal]: https://github.com/N3dal/
[@ovalseven8]: https://github.com/ovalseven8/
[@IndianaDschones]: https://github.com/IndianaDschones/
[@FloThinksPi]: https://github.com/FloThinksPi/
[@Pythonix]: https://github.com/Pythonix/
[@econic]: https://github.com/econic/
[@JlnWntr]: https://github.com/JlnWntr/
[@bluec0re]: https://github.com/bluec0re/
[@Octoate]: https://github.com/Octoate/
