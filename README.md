# Upload Github-Actions Artifacts TO Google Drive

[![GitHub release](https://img.shields.io/github/v/release/Jumbo810/Upload_Github_Artifacts_TO_GDrive)](https://github.com/Jumbo810/Upload_Github_Artifacts_TO_GDrive/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/Jumbo810/Upload_Github_Artifacts_TO_GDrive/actions/workflows/ci.yml/badge.svg)](https://github.com/Jumbo810/Upload_Github_Artifacts_TO_GDrive/actions/workflows/ci.yml)

Github Action To Upload Artifacts to Google Drive Using A Google Drive API.

## 📺 Video Tutorial

Watch our comprehensive tutorial on how to use this action:

[![Video Tutorial](https://img.shields.io/badge/Watch-Tutorial%20Video-red?style=for-the-badge&logo=youtube)](https://drive.google.com/file/d/1GsKSFmh5IpujFuOaKKsOYKvar-tf5etY/view?usp=sharing)

This tutorial covers:
- Setting up the Google Drive API
- Creating and configuring a service account
- Using the action in your GitHub workflow
- Handling different upload scenarios

## 🚀 Quick Start

```yaml
steps:
    - uses: actions/checkout@v4.1.1

    - name: Upload Artifacts TO Google Drive
      uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.3.1
      with:
        target: <LOCAL_PATH_TO_YOUR_FILE>
        credentials: ${{ secrets.YOUR_SERVICE_ACCOUNT_CREDENTIALS }}
        parent_folder_id: <YOUR_DRIVE_FOLDER_ID>
```

## ✨ Features

- Upload files from your GitHub workflow to Google Drive
- Support for uploading multiple files using glob patterns
- Create nested folders automatically
- Option to override existing files
- Support for custom file naming
- Secure handling of Google Drive credentials
- Multiple file handling strategies (delete, update, or add new)

## 🔧 Setting Up Google Drive API

Before using this action, you need to set up the Google Drive API:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. [Create a new project](https://console.cloud.google.com/projectcreate) or select an existing one
3. Enable the Google Drive API
4. Create a service account
5. Create a key for the service account (JSON format)
6. Base64 encode the JSON key file:
   ```bash
   base64 my_service_account_key.json > encoded.txt
   ```
7. Store the encoded key in a GitHub Secret
8. Share your Google Drive folder with the service account email

For a visual guide, please refer to our [video tutorial](https://drive.google.com/file/d/1GsKSFmh5IpujFuOaKKsOYKvar-tf5etY/view?usp=sharing).

## 📋 Usage Examples

### Upload multiple files using glob pattern:
```yaml
steps:
    - uses: actions/checkout@v4.1.1

    - name: Upload Multiple Files TO Google Drive
      uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.3.1
      with:
        target: "dist/*.zip"
        credentials: ${{ secrets.YOUR_SERVICE_ACCOUNT_CREDENTIALS }}
        parent_folder_id: <YOUR_DRIVE_FOLDER_ID>
```

### Upload to a nested folder with custom name:
```yaml
steps:
    - uses: actions/checkout@v4.1.1

    - name: Upload to Nested Folder with Custom Name
      uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.3.1
      with:
        target: build/app.jar
        name: application-${{ github.sha }}.jar
        credentials: ${{ secrets.YOUR_SERVICE_ACCOUNT_CREDENTIALS }}
        parent_folder_id: <YOUR_DRIVE_FOLDER_ID>
        child_folder: releases/${{ github.ref_name }}
```

### Upload with file override:
```yaml
steps:
    - uses: actions/checkout@v4.1.1

    - name: Upload with Override
      uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.3.1
      with:
        target: build/latest.zip
        credentials: ${{ secrets.YOUR_SERVICE_ACCOUNT_CREDENTIALS }}
        parent_folder_id: <YOUR_DRIVE_FOLDER_ID>
        override: true
```

### Upload with custom ownership:
```yaml
steps:
    - uses: actions/checkout@v4.1.1

    - name: Upload with Custom Ownership
      uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.3.1
      with:
        target: build/report.pdf
        credentials: ${{ secrets.YOUR_SERVICE_ACCOUNT_CREDENTIALS }}
        parent_folder_id: <YOUR_DRIVE_FOLDER_ID>
        owner: user@yourdomain.com
```

### Using different replace modes:
```yaml
steps:
    - uses: actions/checkout@v4.1.1

    - name: Upload with Update-in-Place Strategy
      uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.3.1
      with:
        target: build/latest.zip
        credentials: ${{ secrets.YOUR_SERVICE_ACCOUNT_CREDENTIALS }}
        parent_folder_id: <YOUR_DRIVE_FOLDER_ID>
        replace_mode: update_in_place
```

## ⚙️ Input Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `target` | Yes | Local path to the file to upload, can be relative from github runner current directory. You can also specify a glob pattern to upload multiple files at once (this will cause the name property to be ignored). |
| `credentials` | Yes | A service account public/private key pair encoded in base64. |
| `parent_folder_id` | Yes | The id of the drive folder where you want to upload your file. It is the string of characters after the last `/` when browsing to your folder URL. You must share the folder with the service account (using its email address) unless you specify a `owner`. |
| `name` | No | The name of the file to be uploaded. Set to the `target` filename if not specified. (Ignored if target contains a glob `*` or `**`) |
| `child_folder` | No | A sub-folder where to upload your file. It will be created if non-existent and must remain unique. |
| `owner` | No | The email address of a user account that has access to the drive folder and will get the ownership of the file after its creation. To use this feature you must grant your service account a [domain-wide delegation of authority](https://developers.google.com/admin-sdk/directory/v1/guides/delegation) beforehand. |
| `override` | No | If set true, delete files with the same name before uploading. |
| `replace_mode` | No | Determines how to handle existing files with the same name. Options: `delete_first`, `update_in_place`, or `add_new` (default) |

## 📤 Output Parameters

The action provides the following outputs that can be used in subsequent steps:

### Single File Upload:
- `file_id`: The ID of the uploaded file
- `file_name`: The name of the uploaded file
- `web_view_link`: The web view link to access the file in Google Drive
- `upload_count`: The number of files uploaded (will be "1")

### Multiple File Upload (using glob patterns):
- `file_ids`: Comma-separated list of file IDs
- `file_names`: Comma-separated list of file names
- `web_view_links`: Comma-separated list of web view links
- `upload_count`: The number of files uploaded

### Example usage of outputs:

```yaml
- name: Upload to Google Drive
  id: upload
  uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.3.1
  with:
    credentials: ${{ secrets.GOOGLE_CREDENTIALS }}
    parent_folder_id: ${{ secrets.GOOGLE_PARENT_FOLDER_ID }}
    target: "./build/my-app.zip"
    
- name: Use the upload outputs
  run: |
    echo "File ID: ${{ steps.upload.outputs.file_id }}"
    echo "File Name: ${{ steps.upload.outputs.file_name }}"
    echo "Web View Link: ${{ steps.upload.outputs.web_view_link }}"
```

## 🔍 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure your credentials are correctly base64 encoded
   - Check that the service account has access to the specified folder

2. **File Not Found**
   - Verify that the target path is correct
   - Check if the file exists in your workflow environment

3. **Permission Denied**
   - Ensure the service account has write access to the folder
   - Check if domain-wide delegation is properly set up when using the owner parameter

4. **Multiple Files with Same Name**
   - Use the override parameter to replace existing files
   - Use unique filenames or add timestamps to avoid conflicts

## 🔄 Release Process

This project uses automated workflows to simplify the release process:

1. **Automatic Dist Updates**: After successful CI runs on the master branch, the `dist/index.js` file is automatically updated with the latest build artifact.

2. **Creating a Release**:
   - Update the version in `package.json` and `CHANGELOG.md`
   - Merge changes to the master branch
   - Create and push a new tag: `git tag v2.3.1 && git push origin v2.3.1`
   - The release workflow will automatically create a GitHub release

## 🔒 Security

For security best practices when using this action, please refer to our [Security Policy](SECURITY.md).

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

