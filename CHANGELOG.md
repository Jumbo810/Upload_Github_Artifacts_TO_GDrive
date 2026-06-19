# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [2.3.5] - 2026-06-19
### Changed
- **Runtime**: Upgraded GitHub Action runtime to **Node.js 24 LTS** to avoid deprecation warnings and fully support modern environments (resolves #93).

## [2.3.4] - 2026-04-13
### Added
- **Formal Outputs**: Formally declared all action outputs in `action.yml` for better workflow integration and autocompletion.

### Fixed
- **Output Naming**: Fixed a typo where single file uploads were setting `web_view_links` instead of `web_view_link`.
- **Logging**: Improved retention policy error logging by using GitHub Action warnings instead of console errors.

### Changed
- **Runtime**: Upgraded GitHub Action runtime to **Node.js 22** for better performance and long-term support.
- **Dependencies**: Updated core dependencies (downgraded `@actions/core` to v2.x to maintain `ncc` compatibility).
- **CI**: Cleaned up redundant steps in the CI workflow.

## [2.3.3] - 2025-12-17
### Added
- **Share Notifications**: New `send_share_notification` input to opt-in for email alerts when files are shared.
- **Smart Credentials**: Support for plain JSON service account keys (Base64 no longer required).
- **Auto-Sharing**: New `share_with` input to immediately grant read access to specific emails.
- **Conversion**: New `convert_files` input to automatically convert CSV/Excel/Markdown to Google formats.
- **Retention Policy**: New `max_retention_count` input to automatically delete older files (Safe "Same-Name" Version History).
- **Metadata**: New `set_metadata` input to inject GitHub context (commit, branch, run ID) into file descriptions.
- **Resumable Uploads**: Automatically switches to resumable upload for files > 5MB.

### Fixed
- **Authentication**: Fixed "Request is missing required authentication credential" error by sanitizing private key newlines and correctly handling the optional owner parameter.
- **Release**: Ensured `dist/index.js` is correctly updated with the latest fixes.

### Changed
- Refactored `src/index.js` for better testability.
- **Documentation**: Completely reorganized README.md into "Basic" and "Advanced" sections for easier usage.

## [2.3.2] - 2025-12-17

### Added
- Added `npm test` script and unit tests for utility functions
- Added `dependabot.yml` for automated dependency updates
- Added section to README about Shared Drives and Storage Quota troubleshooting

### Changed
- Updated documentation to prioritize Shared Drives as the solution for quota errors
- Updated dependencies: `@actions/core`, `glob`, `googleapis` to latest versions
- Aligned Node.js versions: Workflows and local environment now use v22

## [2.3.1] - 2025-05-24

### Fixed
- Updated Node.js runtime from `node22` to `node20` for GitHub Actions compatibility
- GitHub Actions currently supports up to Node.js 20, not Node.js 22

## [2.3.0] - 2025-05-24

### Added
- New `replace_mode` parameter with options:
  - `delete_first`: Delete existing files before uploading (same as override=true)
  - `update_in_place`: Update existing files in place, preserving file ID and sharing links
  - `add_new`: Create a new file even if one with the same name exists (default)
- File outputs for use in subsequent workflow steps:
  - `file_id` and `file_ids`: ID(s) of uploaded file(s)
  - `file_name` and `file_names`: Name(s) of uploaded file(s)
  - `web_view_link` and `web_view_links`: Web view link(s) to access the file(s)
  - `upload_count`: Number of files uploaded
- Improved error handling with retry logic for API operations
- Better logging for debugging issues
- Support for Windows self-hosted runners
- Automated workflows for dist updates and releases
- Custom ESLint configuration

### Fixed
- Issue with `override` parameter not working on some runners
- Improved folder creation logic with better error handling
- Better handling of glob pattern matching
- Fixed missing eslint-plugin-import dependency

### Changed
- Updated dependencies to latest versions:
  - @actions/core: ^1.11.1
  - glob: ^11.0.2
  - googleapis: ^149.0.0
- Updated documentation with examples of using outputs
- Improved code structure with better separation of concerns
- Enhanced logging for better debugging

### Security
- Added SECURITY.md with security best practices

## [2.2.3] - 2023-05-24

### Added
- Added CHANGELOG.md for better version tracking
- Added SECURITY.md with security best practices
- Added more detailed error messages and improved logging
- Added input validation with helpful error messages
- Added retry logic for failed uploads
- Added more usage examples in README

### Changed
- Updated dependencies to latest versions
- Enhanced documentation with badges and examples
- Improved error handling for common failure scenarios
- Enhanced action.yml description for better marketplace visibility

### Fixed
- Fixed version inconsistency between package.json and README
- Fixed missing eslint-plugin-import dependency

## [2.2.2] - Previous Release

### Added
- Support for uploading multiple files using glob patterns
- Option to override existing files with the same name

### Changed
- Updated to Node.js 22.x
- Improved folder creation logic

## [2.2.1] - Earlier Release

### Added
- Support for creating nested folders
- Option to specify custom filename

## [2.0.0] - Initial Major Release

### Added
- Initial implementation of Google Drive upload functionality
- Support for service account authentication
- Support for optional owner parameter
- Basic error handling and logging
