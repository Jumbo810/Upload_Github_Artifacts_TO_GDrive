# Changelog

All notable changes to this project will be documented in this file.

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

### Fixed
- Issue with `override` parameter not working on some runners
- Improved folder creation logic with better error handling
- Better handling of glob pattern matching

### Changed
- Updated documentation with examples of using outputs
- Improved code structure with better separation of concerns
- Enhanced logging for better debugging

## [2.2.3] - 2025-05-24

### Added
- Automated workflows for dist updates and releases
- Custom ESLint configuration

### Changed
- Updated Node.js to version 22
- Improved documentation

## [2.2.2] - 2024-10-15

### Fixed
- Various bug fixes and improvements

## [2.2.1] - 2024-02-09

### Fixed
- Bug fixes and performance improvements

## [2.2.0] - 2023-11-22

### Added
- Support for glob patterns to upload multiple files
- Added child_folder parameter for nested folder creation

## [2.1.0] - 2023-05-15

### Added
- Support for shared drives
- Improved error handling

## [2.0.0] - 2022-12-10

### Changed
- Complete rewrite with improved authentication
- Added support for service accounts

## [1.0.0] - 2022-06-01

### Added
- Initial release

