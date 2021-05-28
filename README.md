# Linux packages (DEB, RPM) repository setup tool.

Setup linux respository structure.



## Setup, develop, build
### npm
setup: `npm i`
start develop: `npm run build:dev` or build prod: `npm run build:prod`

### yarn
setup `yarn`
start develop: `yarn build:dev` or build prod `yarn build:prod`


## CLI

|--arg                          |-short    | required | description              |
|-------------------------------|----------|----------|--------------------------|
|--storage-root=path            | -s=path  | *        | path to where packages are stored |
|--repo-root=path               | -r=path  |          | path to repository root where  (by default same as --storage-root) |
|--package-type=type            | -r=path  |          | path to repository root where  (by default same as --storage-root) |
|--artifactory-host=host        |          | *        | jfrog Artifatory host |
|--artifactory-user=username    |          | *        | jfrog Artifatory user |
|--artifactory-apikey=jfapikey  |          | *        | jfrog Artifatory user's Api key |
|--deb-dist=name                |          |          | Debian distribution name (default: stable) |
|--deb-component=name           |          |          | Debian component name (default: main) |
|--gpg-key-name=name            | -k=name  |          | Key name that will be used |
|--dry-run                      | -n       |          | Dry run: do nothing only prints what to do. |
|--show-conf                    |          |          | Print json object for the used configuration. |

### jFrog notes

Currently supported [Basic authentication using your username and API Key](https://www.jfrog.com/confluence/display/JFROG/Artifactory+REST+API#ArtifactoryRESTAPI-Authentication): user name and Api key must be provided. Each request will use **Authorization** (http header) = base64('Basic jfuser:jfapikey'). Instead of api key password password also can be used.


## Metapointer file format.

> **#metapointer** *PROVIDERNAME*
> **oid** *provider_secific_data*

Providers:

|Provider   |Data                                      | Sample                                 |
|-----------|------------------------------------------|----------------------------------------|
|jfrogart   | **oid** aql_request_field:field_value    |oid md5:e26a6019c8da5d9a3e6f742c0c6cc02c|

Sample for jfrogart

> **#metapointer** *jfrogart*
> **oid** *md5:e26a6019c8da5d9a3e6f742c0c6cc02c*

or

> **#metapointer** *jfrogart*
> **oid** *name:myfilename.txt*

## Publish a new release
1. Make an annotated git tag using `git tag -a <version>` or `git tag -s <version>`, if signed tag is preferred.
2. Checkout the tag, cleanup the working tree.
3. Build the package: `npm run build:prod -- --appVersion <version>`.
4. Test the publish: `npm publish dist --dry-run`, check the package contents.
5. Perform the actual publishing: `npm publish dist`.
