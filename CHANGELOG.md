# Threema Web Changelog

This changelog lists the most important changes for each released version. For
the full log, please refer to the git commit history.

> :warning: **Note:** Threema Web is in maintenance mode while we are working on a new
> solution that should resolve some of the long-standing issues we were having
> with Threema Web. We will still do regular maintenance and fix critical bugs,
> but for now there will be no major new features or non-critical bugfixes.
> See https://github.com/threema-ch/threema-web/pull/996 for more details.


### [v2.3.11][v2.3.11] (2021-03-16)

Changes:

* [feature] Add support for HMS push tokens ([#1044][i1044])
* [bug] Revert clearing of search when clicking on conversation / contact ([#1042][i1042])


### [v2.3.10][v2.3.10] (2021-03-03)

Changes:

* [bug] Fix playback of audio messages in newer Chromium browsers ([#1039][i1039])
* [bug] Do not allow adding own ID to groups / distribution lists ([#1040][i1040])


### [v2.3.9][v2.3.9] (2021-02-23)

Changes:

* [feature] Allow easily clearing search box ([#92][i92], [#1026][i1026])
* [feature] Add option for minimal user interface ([#1029][i1029])
* [feature] Allow scanning QR codes on inverted background ([#1027][i1027])
* [feature] Add Bulgarian, Korean, Romanian translations ([#1036][i1036])
* [feature] Update emoji to Unicode 13 ([#1034][i1034])
* [feature] Emoji picker: Use shortname as title text ([#1034][i1034])
* [bug] Translate title in error dialog ([#1033][i1033])
* [change] Remove feature mask checks ([#1035][i1035])

Contributors:

- [Jonas Wanner][@jwanner83]
- [Sam][@samuelT2]


### [v2.3.8][v2.3.8] (2021-01-12)

Changes:

* [feature] Add a setting for inverted newline/submit behavior ([#274][i274], [#1007][i1007])
* [feature] Add Turkish, Russian, Hungarian and partial Esperanto translations ([#1021][i1021])
* [bug] Fix double newlines when pasting text ([#1012][i1012])
* [bug] Fix typing indicator on focus loss ([#992][i992])
* [bug] Provide the mime type when creating a Blob ([#999][i999])
* [bug] Fix logic for determining whether a point in time was yesterday ([#1014][i1014])
* [change] Upgrade many dependencies ([#1011][i1011])

Contributors:

- [Dennis Heer][@dennisheer]
- [Raphael Das Gupta][@das-g]


### [v2.3.7][v2.3.7] (2020-04-06)

Changes:

* [feature] Make Threema Web a simple PWA ([#972][i972])
* [feature] Improved error and exception logging ([#981][i981] / [#978][i978])
* [change] Design update: New font, new logo ([#979][i979])
* [change] Password input field: Remove autocomplete=off attribute ([#976][i976])
* [bug] Only send typing update to contact receivers ([#974][i974])
* [bug] Correctly handle invalid / revoked contacts ([#980][i980])

Changes relevant when self-hosting:

* If you deployed Threema Web on a server with restrictive CSP rules, make sure
  to add `static.threema.ch` as an allowed style / font source ([#979][i979])

Contributors:

- [@chrisly-bear][@chrisly-bear]


### [v2.3.6][v2.3.6] (2020-03-12)

Changes:

* [feature] Add official support for Edge 79+ ([#971][i971])
* [change] Upgrade dependencies ([#968][i968])


### [v2.3.5][v2.3.5] (2020-02-24)

Changes:

* [bug] Fix auto-reconnecting in Chrome 80+ ([#969][i969])
* [bug] Don't add null quote objects to outgoing messages ([#966][i966])
* [feature] Show message ID in history dialog ([#965][i965])


### [v2.3.4][v2.3.4] (2020-01-22)

Changes:

* [bug] Do not fail the session when the data channel has been closed ([#961][i961])


### [v2.3.3][v2.3.3] (2020-01-14)

Changes:

* [bug] Handle valueTooLong error when sending text message ([#956][i956])
* [bug] Reintroduce dual stack TURN servers ([#957][i957])
* [bug] Do not show protocol error alert when data channel closes ([#958][i958])


### [v2.3.2][v2.3.2] (2020-01-08)

Changes:

* [feature] Ignore case when translating shortcodes ([#953][i953])
* [bug] Fix compose area size calculation ([#950][i950])
* [bug] Update ICE servers in troubleshoot tool to reflect config ([#952][i952])
* [change] Revert PR [#893][i893] ([#954][i954])

Contributors:

- [@ovalseven8][@ovalseven8]


### [v2.3.1][v2.3.1] (2019-12-19)

This is a small bugfix release, no new features.

Changes:

* [bug] Don't connect if another session is active ([#927][i927])
* [change] Update translation strings


### [v2.3.0][v2.3.0] Säntis (2019-12-17)

Changes:

* [feature] Allow sending files larger than 15 MiB ([#769][i769] / [#594][i594] / [#7][i7])
* [feature] Add support for `https://threema.id/` URLs ([#918][i918])
* [feature] Add graphical password strength indicator ([#929][i929])
* [feature] Update emoji to 12.1, add skin tone selector ([#933][i933])
* [feature] Add Polish translations ([#941][i941])
* [change] CI: New Threema / Threema Work themes ([#904][i904])
* [change] Improved URL parsing ([#935][i935])
* [change] Allow dismissing the "device unreachable" dialog ([#931][i931])
* [change] Add length limits to text input fields ([#938][i938])
* [change] Improve TURN pairing ([#910][i910])
* [change] Disable Grammarly on compose area ([#911][i911])
* [change] Upgrade dependencies ([#921][i921] / [#928][i928])
* [bug] Fix bug where scrolling up sometimes fails ([#18][i18] / [#923][i923])
* [bug] Fix feature level check when sending image/video messages ([#936][i936])
* [bug] Fix some race conditions in connection handling ([#893][i893])
* [bug] Handle rejected pushes gracefully ([#894][i894])
* [bug] Fix max text message size checks ([#903][i903])
* [bug] Show warning if browser does not support TextDecoder ([#891][i891])

Contributors:

- [@vortex852456][@vortex852456]
- [Karol Kołaciński](https://www.transifex.com/user/profile/Numbie/) (PL translations)


### [v2.2.1][v2.2.1] (2019-08-08)

Changes:

* [change] Show warning if browser does not support WebAssembly ([#887][i887])
* [change] Invert order of messages in notifications ([#888][i888])


### [v2.2.0][v2.2.0] Fluebrig (2019-08-08)

This is quite a big release. It contains improvements to device wakeup
functionality, adds support for five new languages, provides a new log
reporting tool for troubleshooting and fixes a lot of bugs.

For the detailed list of changes, see below. Note that changes to your web
server configuration are required in case you're self-hosting Threema Web.

Changes:

* [feature] Improvements to the device wakeup functionality, automatic
  reconnects after connection loss should now be more reliable ([#792][i792] /
  [#815][i815] / [#816][i816] / [#817][i817] / [#818][i818])
* [feature] Add Dutch, Portuguese, Slovak, Spanish and Ukrainian translations
* [feature] New log reporting tool ([#839][i839] / [#826][i826])
* [change] Rewritten compose area, many bugs should now be fixed ([#773][i773],
  fixes [#502][i502] / [#674][i674] / [#679][i679] / [#821][i821])
* [change] Revised VoIP status message texts ([#787][i787])
* [change] Better MIME handling for audio messages ([#756][i756])
* [change] Improve message upload preview and thumbnails ([#858][i858])
* [change] Troubleshooting tool: Actually establish a P2P connection ([#838][i838])
* [bug] Fixed connection problems when large profile picture was set ([#768][i768])
* [bug] Workaround for connection loss detection in latest Chrome ([#844][i844])
* [bug] Markup parser: Ignore markup in URLs ([#778][i778])
* [bug] Hide input for blocked contacts ([#462][i462])
* [bug] Only show pin/unpin button if conversation exists ([#752][i752])
* [bug] Clamp text in quotes ([#767][i767])
* [bug] Fix connection bar being flaky ([#824][i824])
* [bug] Allow adding all contacts to distribution lists ([#837][i837])
* [bug] Fix sending files and pictures to distribution lists ([#394][i394])
* [bug] iOS: Recurrent wakeup for unsent messages ([#856][i856])
* [bug] Fix send button when sending only emoji ([#822][i822])
* [bug] Fix fallback image for contacts without avatar ([#851][i851])
* [bug] Fix support for japanese IME ([#777][i777])
* [bug] Accessibility improvements for emoji picker ([#811][i811])

Changes relevant when self-hosting:

* Since Threema Web now contains WebAssembly, the web server hosting the files
  must set the correct MIME-Type (`application/wasm`) for `*.wasm` files. See
  [self hosting docs](https://github.com/threema-ch/threema-web/blob/master/docs/self_hosting.md#threema-web).
* We now provide a [Docker Image](https://github.com/threema-ch/threema-web/blob/master/docs/docker.md).

Changes relevant to developers:

* We switched from Browserify to Webpack

Contributors:

- [@IndianaDschones][@IndianaDschones]
- [@joelfischerr][@joelfischerr]
- [Artem Nachtigall](https://www.transifex.com/user/profile/artem.nachtigall/) (UK translations)
- [Boris Klokoc](https://www.transifex.com/user/profile/klokyno/) (SK translations)
- [Fernando Alvarez Junco](https://www.transifex.com/user/profile/arbesulo/) (ES translations)
- [frau\_lutzn](https://www.transifex.com/user/profile/frau_lutzn/) (NL translations)
- [Johannes Müller](https://www.transifex.com/user/profile/tscho/) (PT translations)
- [Maik Holzhauer](https://www.transifex.com/user/profile/mkhlzhr/) (ES translations)
- [Marcel Krüse](https://www.transifex.com/user/profile/blogkaizzenn/) (PT translations)
- [Nuno\_M](https://www.transifex.com/user/profile/Nuno_M/) (PT translations)
- [Sergiy Kotyk](https://www.transifex.com/user/profile/kitser/) (UK translations)
- [vollkorntomate](https://www.transifex.com/user/profile/vollkorntomate/) (NL translations)


### [v2.1.7][v2.1.7] (2019-02-07)

Changes:

* [bug] Fix state reloading after iOS reconnects ([#728][i728])


### [v2.1.6][v2.1.6] (2019-01-31)

Changes:

* [feature] Show connection state and unread state in favicon ([#720][i720])
* [change] Ensure that webapp loads on browsers without ES2015 support ([#733][i733])
* [change] Change color of Safari pinned tab favicon ([#746][i746])
* [change] Update Czech translations
* [bug] Fix relative paths to emoji images ([#743][i743] / [#748][i748])
* [bug] Fix the use of non-breaking spaces when pasting text ([#745][i745])


### [v2.1.5][v2.1.5] (2019-01-24)

Changes:

* [change] Switch from Emojione to Twitter Emoji (Unicode 11.0) ([#721][i721])
* [bug] Fix pasting of emoji ([#722][i722])
* [bug] Fix UI bug when loading conversations ([#723][i723])


### [v2.1.4][v2.1.4] (2019-01-17)

Changes:

* [change] Update many dependencies
* [change] Strip sourceMappingURL lines from release files ([#709][i709])
* [bug] Fix collapsing of consecutive whitespace in message ([#706][i706])
* [bug] Android: Fix out-of-sync after reconnect ([#712][i712])
* [bug] Conversations: Handle clearing of latest message ([#713][i713])


### [v2.1.3][v2.1.3] (2018-12-12)

Changes:

* [feature] Add French translations ([#685][i685])
* [feature] Add Chinese translations ([#690][i690])
* [feature] Add Czech translations ([#691][i691])
* [change] Require at least Safari 11 ([#683][i683])
* [change] Style scrollbars in Firefox 64+ ([#689][i689])

Contributors:

- [Valéry](https://www.transifex.com/user/profile/Valéry/) (FR translation)
- [nickya80](https://www.transifex.com/user/profile/nickya80/) (FR translation)
- [vollkorntomate](https://www.transifex.com/user/profile/vollkorntomate/) (FR translation)
- [mingmir](https://www.transifex.com/user/profile/mingmir/) (CN translation)
- [vit.semenec](https://www.transifex.com/user/profile/vit.semenec/) (CS translation)


### [v2.1.2][v2.1.2] (2018-11-22)

Changes:

* [change] Prevent Chrome from translating Threema Web ([#681][i681])
* [bug] Contacts: Exclude hidden receivers ([#655][i655])
* [bug] Member list editor: Handle inactive contacts ([#665][i665])
* [bug] Stop validating args for create/group & create/distributionList ([#666][i666])
* [bug] Inserting emoji fixes ([#574][i574] / [#671][i671] / [#672][i672] / [#673][i673])
* [bug] Avoid flash of untranslated text ([#676][i676])


### [v2.1.1][v2.1.1] (2018-10-29)

Changes:

* [feature] Improved troubleshooting tool ([#648][i648])
* [change] Latest message text: Show "GIF" for GIFs ([#649][i649])
* [bug] Accessibility improvements ([#656][i656])

Contributors:

- [@MarcoZehe][@MarcoZehe]


### [v2.1.0][v2.1.0] Glärnisch (2018-10-23)

Changes:

* [feature] Implement ack protocol for iOS session resumption ([#551][i551])
* [feature] Implement pinning of conversations ([#361][i361])
* [change] New stack based markup parser ([#453][i453] / [#458][i458] / [#590][i590])
* [change] Accessibility improvements ([#562][i562] / [#618][i618] / [#622][i622] / [#636][i636])
* [change] Hide WebRTC troubleshooting when using iOS ([#625][i625])
* [change] Use window focus instead of page visibility to mark messages as read ([#644][i644])
* [bug] Don't linkify latest message excerpt in conversation list ([#544][i544])
* [bug] Workaround for conversation loading bug in Safari ([#602][i602])
* [bug] Fix marking of read messages with duplicate sort key ([#606][i606])
* [bug] Compose area: Fix newlines in Safari ([#613][i613])
* [bug] Fix largeSingleEmoji setting ([#610][i610])
* [bug] Copy to clipboard: Workaround for Safari on iOS ([#626][i626])
* [bug] Clear isTyping flag when receiving message ([#637][i637])
* [bug] Fix updating of message caption ([#638][i638])
* [bug] Hide image preview when redirecting ([#640][i640])
* [bug] Fix updating of avatars in contact autocomplete box ([#643][i643])

Contributors:

- [@MarcoZehe][@MarcoZehe]


### [v2.0.3][v2.0.3] (2018-08-23)

Changes:

* [feature] Add reload button to connect error page ([#545][i545])
* [change] Refactor browser detection ([#569][i569])
* [change] UI performance improvements ([#567][i567])
* [bug] Compose area: Add newline workaround for Safari ([#572][i572])

Contributors:

- [@SirTyson][@SirTyson]


### [v2.0.2][v2.0.2] (2018-08-14)

Changes:

* [bug] Fix work indicator ([#558][i558])
* [bug] Fix status of newly created groups ([#563][i563])


### [v2.0.1][v2.0.1] (2018-08-07)

Changes:

* [feature] Cancel battery alert when phone is plugged in ([#547][i547])
* [bug] Fix group / distribution list contact selector ([#550][i550])
* [bug] Fix troubleshooting background image and favicon

Contributors:

- [@iasdeoupxe][@iasdeoupxe]
- [@SirTyson][@SirTyson]


### [v2.0.0][v2.0.0] Grosser Mythen (2018-08-02)

This release changes the protocol version from 1 to 2. It provides preliminary
support for iOS devices (currently in beta). It also improves the performance
and responsiveness of Threema Web.

For the detailed list of changes, see the list below.

Changes:

* [feature] Add preliminary support for iOS / Safari, currently in Beta ([#58][i58])
* [feature] Allow viewing and editing your own profile ([#221][i221])
* [feature] Show message events ([#32][i32])
* [feature] Large single emoji ([#97][i97])
* [feature] Show distribution list members ([#472][i472])
* [feature] Add "Navigate to" entry to location message context menu
* [feature] Implement support for new per-conversation notification settings
* [feature] Hide inactive IDs in contact list ([#4][i4])
* [feature] Implement "copy to clipboard" functionality
* [feature] Show three blue dots for verified Threema Work contacts
* [feature] Implement non-work indicator for Threema Work users
* [change] Threema Web protocol version upgrade from 1 to 2
* [change] When downloading media, filename now contains timestamp
* [bug] Fix a lot of UI performance issues ([#480][i480])
* [bug] Saving profile without setting picture won't reset it anymore ([#154][i154])
* [bug] Fix race condition in password field ([#445][i445])
* [bug] When entering the wrong password, re-enable the input field
* [bug] Fix broken conversation preview ([#393][i393])
* [bug] Make message caption mouse-selectable ([#303][i303])
* [bug] Fix error message when adding an invalid contact identity
* [bug] Fix closing of chat when deleting conversation
* [bug] Improve scrolling behavior ([#18][i18])
* [bug] Fix "unread messages" indicator

Contributors:

- [@heckenmann][@heckenmann]
- [@IndianaDschones][@IndianaDschones]
- [@JanRei][@JanRei]
- [@ovalseven8][@ovalseven8]


### [v1.8.2][v1.8.2] (2018-02-21)

Changes:

* [feature] Add autocomplete attribute to password fields ([#441][i441])
* [feature] Get build script to work on macOS ([#406][i406])
* [bug] Fix location of web manifest ([#432][i432])
* [bug] Fix CSS mouse pointer over contact group membership list ([#435][i435])
* [bug] Fix supportsPassive helper function ([#439][i439])
* [bug] Fix quote preview styling in Chromium
* [bug] Prevent dragging of background image ([#425][i425])

Contributors:

- [@joelfischerr][@joelfischerr]
- [@ovalseven8][@ovalseven8]
- [@rugk][@rugk]


### [v1.8.1][v1.8.1] (2018-02-06)

Changes:

* [change] Make mentions display-only ([#419][i419])


### [v1.8.0][v1.8.0] (2018-02-06)

Changes:

* [feature] Replace :shortnames: with emojis ([#390][i390])
* [feature] Show preview in dialog when sending image message ([#401][i401])
* [feature] Implement mentions ([#404][i404] / [#410][i410])
* [feature] Show a dialog when local storage cannot be accessed ([#402][i402])
* [feature] Add Web App Manifest ([#408][i408])
* [bug] Workaround for sending .ogg audio in Firefox ([#396][i396])

Contributors:

- [@rugk][@rugk]


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

[i4]: https://github.com/threema-ch/threema-web/issues/4
[i6]: https://github.com/threema-ch/threema-web/issues/6
[i7]: https://github.com/threema-ch/threema-web/issues/7
[i8]: https://github.com/threema-ch/threema-web/issues/8
[i11]: https://github.com/threema-ch/threema-web/issues/11
[i17]: https://github.com/threema-ch/threema-web/issues/17
[i18]: https://github.com/threema-ch/threema-web/issues/18
[i20]: https://github.com/threema-ch/threema-web/issues/20
[i29]: https://github.com/threema-ch/threema-web/issues/29
[i32]: https://github.com/threema-ch/threema-web/issues/32
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
[i58]: https://github.com/threema-ch/threema-web/issues/58
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
[i97]: https://github.com/threema-ch/threema-web/issues/97
[i92]: https://github.com/threema-ch/threema-web/issues/92
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
[i154]: https://github.com/threema-ch/threema-web/issues/154
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
[i221]: https://github.com/threema-ch/threema-web/issues/221
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
[i274]: https://github.com/threema-ch/threema-web/issues/274
[i275]: https://github.com/threema-ch/threema-web/issues/275
[i281]: https://github.com/threema-ch/threema-web/issues/281
[i282]: https://github.com/threema-ch/threema-web/issues/282
[i285]: https://github.com/threema-ch/threema-web/issues/285
[i289]: https://github.com/threema-ch/threema-web/issues/289
[i291]: https://github.com/threema-ch/threema-web/issues/291
[i296]: https://github.com/threema-ch/threema-web/issues/296
[i303]: https://github.com/threema-ch/threema-web/issues/303
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
[i361]: https://github.com/threema-ch/threema-web/issues/361
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
[i390]: https://github.com/threema-ch/threema-web/issues/390
[i393]: https://github.com/threema-ch/threema-web/issues/393
[i394]: https://github.com/threema-ch/threema-web/issues/394
[i396]: https://github.com/threema-ch/threema-web/issues/396
[i401]: https://github.com/threema-ch/threema-web/issues/401
[i402]: https://github.com/threema-ch/threema-web/issues/402
[i404]: https://github.com/threema-ch/threema-web/issues/404
[i406]: https://github.com/threema-ch/threema-web/issues/406
[i408]: https://github.com/threema-ch/threema-web/issues/408
[i410]: https://github.com/threema-ch/threema-web/issues/410
[i419]: https://github.com/threema-ch/threema-web/issues/419
[i425]: https://github.com/threema-ch/threema-web/issues/425
[i432]: https://github.com/threema-ch/threema-web/issues/432
[i435]: https://github.com/threema-ch/threema-web/issues/435
[i439]: https://github.com/threema-ch/threema-web/issues/439
[i441]: https://github.com/threema-ch/threema-web/issues/441
[i445]: https://github.com/threema-ch/threema-web/issues/445
[i453]: https://github.com/threema-ch/threema-web/issues/453
[i458]: https://github.com/threema-ch/threema-web/issues/458
[i462]: https://github.com/threema-ch/threema-web/issues/462
[i472]: https://github.com/threema-ch/threema-web/issues/472
[i480]: https://github.com/threema-ch/threema-web/issues/480
[i502]: https://github.com/threema-ch/threema-web/issues/502
[i503]: https://github.com/threema-ch/threema-web/issues/503
[i517]: https://github.com/threema-ch/threema-web/issues/517
[i519]: https://github.com/threema-ch/threema-web/issues/519
[i522]: https://github.com/threema-ch/threema-web/issues/522
[i528]: https://github.com/threema-ch/threema-web/issues/528
[i544]: https://github.com/threema-ch/threema-web/issues/544
[i545]: https://github.com/threema-ch/threema-web/issues/545
[i547]: https://github.com/threema-ch/threema-web/issues/547
[i550]: https://github.com/threema-ch/threema-web/issues/550
[i551]: https://github.com/threema-ch/threema-web/issues/551
[i558]: https://github.com/threema-ch/threema-web/issues/558
[i562]: https://github.com/threema-ch/threema-web/issues/562
[i563]: https://github.com/threema-ch/threema-web/issues/563
[i567]: https://github.com/threema-ch/threema-web/issues/567
[i569]: https://github.com/threema-ch/threema-web/issues/569
[i572]: https://github.com/threema-ch/threema-web/issues/572
[i574]: https://github.com/threema-ch/threema-web/issues/574
[i590]: https://github.com/threema-ch/threema-web/pull/590
[i594]: https://github.com/threema-ch/threema-web/issues/594
[i597]: https://github.com/threema-ch/threema-web/pull/597
[i602]: https://github.com/threema-ch/threema-web/pull/602
[i606]: https://github.com/threema-ch/threema-web/pull/606
[i610]: https://github.com/threema-ch/threema-web/pull/610
[i613]: https://github.com/threema-ch/threema-web/pull/613
[i618]: https://github.com/threema-ch/threema-web/pull/618
[i622]: https://github.com/threema-ch/threema-web/pull/622
[i625]: https://github.com/threema-ch/threema-web/pull/625
[i626]: https://github.com/threema-ch/threema-web/pull/626
[i636]: https://github.com/threema-ch/threema-web/pull/636
[i637]: https://github.com/threema-ch/threema-web/pull/637
[i638]: https://github.com/threema-ch/threema-web/pull/638
[i640]: https://github.com/threema-ch/threema-web/pull/640
[i643]: https://github.com/threema-ch/threema-web/pull/643
[i644]: https://github.com/threema-ch/threema-web/pull/644
[i648]: https://github.com/threema-ch/threema-web/pull/648
[i649]: https://github.com/threema-ch/threema-web/pull/649
[i655]: https://github.com/threema-ch/threema-web/issues/655
[i656]: https://github.com/threema-ch/threema-web/pull/656
[i665]: https://github.com/threema-ch/threema-web/issues/665
[i666]: https://github.com/threema-ch/threema-web/issues/666
[i671]: https://github.com/threema-ch/threema-web/issues/671
[i672]: https://github.com/threema-ch/threema-web/issues/672
[i673]: https://github.com/threema-ch/threema-web/issues/673
[i674]: https://github.com/threema-ch/threema-web/issues/674
[i676]: https://github.com/threema-ch/threema-web/issues/676
[i679]: https://github.com/threema-ch/threema-web/issues/679
[i681]: https://github.com/threema-ch/threema-web/issues/681
[i683]: https://github.com/threema-ch/threema-web/issues/683
[i685]: https://github.com/threema-ch/threema-web/issues/685
[i689]: https://github.com/threema-ch/threema-web/issues/689
[i690]: https://github.com/threema-ch/threema-web/issues/690
[i691]: https://github.com/threema-ch/threema-web/issues/691
[i706]: https://github.com/threema-ch/threema-web/issues/706
[i709]: https://github.com/threema-ch/threema-web/issues/709
[i712]: https://github.com/threema-ch/threema-web/issues/712
[i713]: https://github.com/threema-ch/threema-web/issues/713
[i720]: https://github.com/threema-ch/threema-web/issues/720
[i721]: https://github.com/threema-ch/threema-web/issues/721
[i722]: https://github.com/threema-ch/threema-web/issues/722
[i723]: https://github.com/threema-ch/threema-web/issues/723
[i728]: https://github.com/threema-ch/threema-web/issues/728
[i733]: https://github.com/threema-ch/threema-web/issues/733
[i743]: https://github.com/threema-ch/threema-web/issues/743
[i745]: https://github.com/threema-ch/threema-web/issues/745
[i746]: https://github.com/threema-ch/threema-web/issues/746
[i748]: https://github.com/threema-ch/threema-web/issues/748
[i752]: https://github.com/threema-ch/threema-web/issues/752
[i756]: https://github.com/threema-ch/threema-web/issues/756
[i767]: https://github.com/threema-ch/threema-web/issues/767
[i768]: https://github.com/threema-ch/threema-web/issues/768
[i769]: https://github.com/threema-ch/threema-web/issues/769
[i773]: https://github.com/threema-ch/threema-web/issues/773
[i777]: https://github.com/threema-ch/threema-web/issues/777
[i778]: https://github.com/threema-ch/threema-web/issues/778
[i787]: https://github.com/threema-ch/threema-web/issues/787
[i792]: https://github.com/threema-ch/threema-web/issues/792
[i811]: https://github.com/threema-ch/threema-web/issues/811
[i815]: https://github.com/threema-ch/threema-web/issues/815
[i816]: https://github.com/threema-ch/threema-web/issues/816
[i817]: https://github.com/threema-ch/threema-web/issues/817
[i818]: https://github.com/threema-ch/threema-web/issues/818
[i821]: https://github.com/threema-ch/threema-web/issues/821
[i822]: https://github.com/threema-ch/threema-web/issues/822
[i824]: https://github.com/threema-ch/threema-web/issues/824
[i826]: https://github.com/threema-ch/threema-web/issues/826
[i832]: https://github.com/threema-ch/threema-web/issues/832
[i837]: https://github.com/threema-ch/threema-web/issues/837
[i838]: https://github.com/threema-ch/threema-web/issues/838
[i839]: https://github.com/threema-ch/threema-web/issues/839
[i844]: https://github.com/threema-ch/threema-web/issues/844
[i851]: https://github.com/threema-ch/threema-web/issues/851
[i856]: https://github.com/threema-ch/threema-web/issues/856
[i858]: https://github.com/threema-ch/threema-web/issues/858
[i887]: https://github.com/threema-ch/threema-web/issues/887
[i888]: https://github.com/threema-ch/threema-web/issues/888
[i891]: https://github.com/threema-ch/threema-web/issues/891
[i893]: https://github.com/threema-ch/threema-web/issues/893
[i894]: https://github.com/threema-ch/threema-web/issues/894
[i903]: https://github.com/threema-ch/threema-web/issues/903
[i904]: https://github.com/threema-ch/threema-web/issues/904
[i910]: https://github.com/threema-ch/threema-web/issues/910
[i911]: https://github.com/threema-ch/threema-web/issues/911
[i918]: https://github.com/threema-ch/threema-web/issues/918
[i921]: https://github.com/threema-ch/threema-web/issues/921
[i923]: https://github.com/threema-ch/threema-web/issues/923
[i927]: https://github.com/threema-ch/threema-web/issues/927
[i928]: https://github.com/threema-ch/threema-web/issues/928
[i929]: https://github.com/threema-ch/threema-web/issues/929
[i931]: https://github.com/threema-ch/threema-web/issues/931
[i933]: https://github.com/threema-ch/threema-web/issues/933
[i935]: https://github.com/threema-ch/threema-web/issues/935
[i936]: https://github.com/threema-ch/threema-web/issues/936
[i938]: https://github.com/threema-ch/threema-web/issues/938
[i941]: https://github.com/threema-ch/threema-web/issues/941
[i950]: https://github.com/threema-ch/threema-web/issues/950
[i952]: https://github.com/threema-ch/threema-web/issues/952
[i953]: https://github.com/threema-ch/threema-web/issues/953
[i954]: https://github.com/threema-ch/threema-web/issues/954
[i956]: https://github.com/threema-ch/threema-web/issues/956
[i957]: https://github.com/threema-ch/threema-web/issues/957
[i958]: https://github.com/threema-ch/threema-web/issues/958
[i961]: https://github.com/threema-ch/threema-web/issues/961
[i965]: https://github.com/threema-ch/threema-web/issues/965
[i966]: https://github.com/threema-ch/threema-web/issues/966
[i968]: https://github.com/threema-ch/threema-web/issues/968
[i969]: https://github.com/threema-ch/threema-web/issues/969
[i971]: https://github.com/threema-ch/threema-web/issues/971
[i972]: https://github.com/threema-ch/threema-web/issues/972
[i974]: https://github.com/threema-ch/threema-web/issues/974
[i976]: https://github.com/threema-ch/threema-web/issues/976
[i978]: https://github.com/threema-ch/threema-web/issues/978
[i979]: https://github.com/threema-ch/threema-web/issues/979
[i980]: https://github.com/threema-ch/threema-web/issues/980
[i981]: https://github.com/threema-ch/threema-web/issues/981
[i992]: https://github.com/threema-ch/threema-web/issues/992
[i999]: https://github.com/threema-ch/threema-web/issues/999
[i1007]: https://github.com/threema-ch/threema-web/issues/1007
[i1014]: https://github.com/threema-ch/threema-web/issues/1014
[i1012]: https://github.com/threema-ch/threema-web/issues/1012
[i1011]: https://github.com/threema-ch/threema-web/issues/1011
[i1021]: https://github.com/threema-ch/threema-web/issues/1021
[i1026]: https://github.com/threema-ch/threema-web/issues/1026
[i1027]: https://github.com/threema-ch/threema-web/issues/1027
[i1029]: https://github.com/threema-ch/threema-web/issues/1029
[i1033]: https://github.com/threema-ch/threema-web/issues/1033
[i1034]: https://github.com/threema-ch/threema-web/issues/1034
[i1035]: https://github.com/threema-ch/threema-web/issues/1035
[i1036]: https://github.com/threema-ch/threema-web/issues/1036
[i1039]: https://github.com/threema-ch/threema-web/issues/1039
[i1040]: https://github.com/threema-ch/threema-web/issues/1040
[i1042]: https://github.com/threema-ch/threema-web/issues/1042
[i1044]: https://github.com/threema-ch/threema-web/issues/1044

[v2.3.11]: https://github.com/threema-ch/threema-web/compare/v2.3.10...v2.3.11
[v2.3.10]: https://github.com/threema-ch/threema-web/compare/v2.3.9...v2.3.10
[v2.3.9]: https://github.com/threema-ch/threema-web/compare/v2.3.8...v2.3.9
[v2.3.8]: https://github.com/threema-ch/threema-web/compare/v2.3.7...v2.3.8
[v2.3.7]: https://github.com/threema-ch/threema-web/compare/v2.3.6...v2.3.7
[v2.3.6]: https://github.com/threema-ch/threema-web/compare/v2.3.5...v2.3.6
[v2.3.5]: https://github.com/threema-ch/threema-web/compare/v2.3.4...v2.3.5
[v2.3.4]: https://github.com/threema-ch/threema-web/compare/v2.3.3...v2.3.4
[v2.3.3]: https://github.com/threema-ch/threema-web/compare/v2.3.2...v2.3.3
[v2.3.2]: https://github.com/threema-ch/threema-web/compare/v2.3.1...v2.3.2
[v2.3.1]: https://github.com/threema-ch/threema-web/compare/v2.3.0...v2.3.1
[v2.3.0]: https://github.com/threema-ch/threema-web/compare/v2.2.1...v2.3.0
[v2.2.1]: https://github.com/threema-ch/threema-web/compare/v2.2.0...v2.2.1
[v2.2.0]: https://github.com/threema-ch/threema-web/compare/v2.1.7...v2.2.0
[v2.1.7]: https://github.com/threema-ch/threema-web/compare/v2.1.6...v2.1.7
[v2.1.6]: https://github.com/threema-ch/threema-web/compare/v2.1.5...v2.1.6
[v2.1.5]: https://github.com/threema-ch/threema-web/compare/v2.1.4...v2.1.5
[v2.1.4]: https://github.com/threema-ch/threema-web/compare/v2.1.3...v2.1.4
[v2.1.3]: https://github.com/threema-ch/threema-web/compare/v2.1.2...v2.1.3
[v2.1.2]: https://github.com/threema-ch/threema-web/compare/v2.1.1...v2.1.2
[v2.1.1]: https://github.com/threema-ch/threema-web/compare/v2.1.0...v2.1.1
[v2.1.0]: https://github.com/threema-ch/threema-web/compare/v2.0.3...v2.1.0
[v2.0.3]: https://github.com/threema-ch/threema-web/compare/v2.0.2...v2.0.3
[v2.0.2]: https://github.com/threema-ch/threema-web/compare/v2.0.1...v2.0.2
[v2.0.1]: https://github.com/threema-ch/threema-web/compare/v2.0.0...v2.0.1
[v2.0.0]: https://github.com/threema-ch/threema-web/compare/v1.8.2...v2.0.0
[v1.8.2]: https://github.com/threema-ch/threema-web/compare/v1.8.1...v1.8.2
[v1.8.1]: https://github.com/threema-ch/threema-web/compare/v1.8.0...v1.8.1
[v1.8.0]: https://github.com/threema-ch/threema-web/compare/v1.7.0...v1.8.0
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
[@joelfischerr]: https://github.com/joelfischerr/
[@JanRei]: https://github.com/JanRei/
[@heckenmann]: https://github.com/heckenmann
[@iasdeoupxe]: https://github.com/iasdeoupxe
[@SirTyson]: https://github.com/SirTyson
[@MarcoZehe]: https://github.com/MarcoZehe
[@vortex852456]: https://github.com/vortex852456
[@chrisly-bear]: https://github.com/chrisly-bear
[@dennisheer]: https://github.com/dennisheer
[@das-g]: https://github.com/das-g
[@samuelT2]: https://github.com/samuelT2
[@jwanner83]: https://github.com/jwanner83
