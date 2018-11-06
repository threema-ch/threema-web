# Releasing

Major release with backwards incompatible changes? Check for `TODO` comments
with deprecations. Remove them if possible.

Update translations:

    $ # Download translation files from transifex.com
    $ git add public/i18n/
    $ git commit -m 'Update translation strings from Transifex'

Set variables:

    $ export VERSION=X.Y.Z
    $ export GPG_KEY=E7ADD9914E260E8B35DFB50665FDE935573ACDA6

Update version numbers:

    $ vim -p package.json
    $ npm install

Update changelog:

    $ vim CHANGELOG.md

Commit & tag:

    $ git commit -S${GPG_KEY} -m "Release v${VERSION}"
    $ git tag -s -u ${GPG_KEY} v${VERSION} -m "Version ${VERSION}"

Push:

    $ git push && git push --tags
