# releasing

versions follow [semver](https://semver.org/): `major.minor.patch`. beta builds add `-beta.N` and are published as GitHub pre-releases.

tags are `v<version>`, for example `v1.0.0-beta.1`. pushing a tag runs `.github/workflows/release.yml`, which extracts the matching section from `CHANGELOG.md` and creates the GitHub release. no separate release notes file.

## steps

1. add a `## <version> - <date>` section to `CHANGELOG.md`. keep the heading exact.
2. bump the version without a git tag:

   ```bash
   npm version <version> --no-git-tag-version
   ```

3. commit the changelog and version bump:

   ```bash
   git commit -am "chore(release): <version>"
   ```

4. tag and push:

   ```bash
   git tag v<version>
   git push origin main v<version>
   ```

5. the workflow creates the release. for a beta, confirm it is marked pre-release.

## rules

- major: breaking changes to the public url, modes, or data format.
- minor: new features, compatible with the current version.
- patch: fixes and copy changes.
- beta: `-beta.N`; bump N for each beta. the stable release drops the suffix and becomes the latest.
- the tag and `package.json` must match; the workflow fails otherwise.
