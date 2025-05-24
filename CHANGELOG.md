# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

