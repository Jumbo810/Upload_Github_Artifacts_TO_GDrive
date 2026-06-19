# Upload Github-Actions Artifacts TO Google Drive

[![GitHub release](https://img.shields.io/github/v/release/Jumbo810/Upload_Github_Artifacts_TO_GDrive)](https://github.com/Jumbo810/Upload_Github_Artifacts_TO_GDrive/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/Jumbo810/Upload_Github_Artifacts_TO_GDrive/actions/workflows/ci.yml/badge.svg)](https://github.com/Jumbo810/Upload_Github_Artifacts_TO_GDrive/actions/workflows/ci.yml)
[![Donate via PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://paypal.me/AllaodeenTariq)

Github Action To Upload Artifacts to Google Drive Using A Google Drive API.

## 📺 Video Tutorial

Watch our comprehensive tutorial on how to use this action:

<a href="https://drive.google.com/file/d/1GsKSFmh5IpujFuOaKKsOYKvar-tf5etY/view?usp=sharing" target="_blank">
  <img src="assets/tutorial-thumbnail.png" width="512" alt="Video Tutorial">
</a>

> [!NOTE]
> The video shows converting credentials to Base64 (**3:27 to 5:00**). **you can skip this part!**
> You can now simply paste the plain JSON content into your GitHub Secret. Base64 is still supported but optional.

This tutorial covers:
- Setting up the Google Drive API
- Creating and configuring a service account
- Using the action in your GitHub workflow
- Handling different upload scenarios

## 🚀 Quick Start

```yaml
steps:
    - uses: actions/checkout@v6

    - name: Upload Artifacts TO Google Drive
      uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.3.5
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
- **Safe Per-File Retention Policy**: Automatically manage version history by keeping only the N most recent versions of *each specific file*, ensuring unrelated files are safe.
- **Share Notifications**: Opt-in email alerts to notify recipients immediately when files are shared with them.
- **Smart Format Conversion**: Automatically convert CSV/Excel/Markdown files to native Google Docs/Sheets formats.
- **Auto-Sharing**: Grant immediate access to teammates via email list.
- **Traceability**: Inject build metadata (Commit, Branch, Run Link) into file description.
- **Smart Resumable Uploads**: Automatically handles large files (>5MB) with robust retry logic.

## 🔧 Setting Up Google Drive API

Before using this action, you need to set up the Google Drive API:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. [Create a new project](https://console.cloud.google.com/projectcreate) or select an existing one
3. Enable the Google Drive API
4. Create a service account
5. Create a key for the service account (JSON format)
6. **Copy the content of the JSON key file.**
   
   *(Note: You can paste the plain JSON text directly. For backward compatibility, Base64 encoded strings are also supported but no longer required.)*

7. Store the JSON content in a GitHub Secret (e.g., `GDRIVE_CREDENTIALS`).
8. Create a folder in Google Drive where you want to upload artifacts, then set the share permission to "Editor" so the Github Action can upload the files to this folder using service account.
9. Copy the ID of your Google Drive folder from the browser URL. When you're viewing your folder in Google Drive, the folder ID is the long string of characters that appears after 'folders/' in the URL. For example, in the URL 'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz12345', the folder ID is '1AbCdEfGhIjKlMnOpQrStUvWxYz12345'. You'll need this ID for the parent_folder_id parameter in your GitHub workflow.

For a visual guide, please refer to our [video tutorial](https://drive.google.com/file/d/1GsKSFmh5IpujFuOaKKsOYKvar-tf5etY/view?usp=sharing).

## ⚠️ Troubleshooting: Storage Quota Errors

**If** you encounter an error like `The user's Drive storage quota has been exceeded`, it is likely because Service Accounts have **0 GB** storage by default.

**Solution (For Google Workspace Users):**
1.  **Create a Shared Drive.**
2.  **Add the Service Account** as a **"Content Manager"**.
3.  **Use the Folder ID** from that Shared Drive in your workflow.

*This bypasses the individual quota limits.*

<details>
<summary><b>Advanced: Uploading to "My Drive" (Requires Admin Setup)</b></summary>

If you absolutely must upload to a personal user's drive and cannot use Shared Drives, you must use **Domain-Wide Delegation**.
1. Enable Domain-Wide Delegation for the Service Account in Google Cloud Console.
2. In Google Admin Console, authorize the Service Account's Client ID with `https://www.googleapis.com/auth/drive` scope.
3. In your Github Action, use the `owner` input to specify the personal email address to impersonate.
</details>

## 📋 Usage Examples

### Upload multiple files using glob pattern:
```yaml
steps:
    - uses: actions/checkout@v6

    - name: Upload Multiple Files TO Google Drive
      uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.3.5
      with:
        target: "dist/*.zip"
        credentials: ${{ secrets.YOUR_SERVICE_ACCOUNT_CREDENTIALS }}
        parent_folder_id: <YOUR_DRIVE_FOLDER_ID>
```

### Upload to a nested folder with custom name:
```yaml
steps:
    - uses: actions/checkout@v6

    - name: Upload to Nested Folder with Custom Name
      uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.3.5
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
    - uses: actions/checkout@v6

    - name: Upload with Override
      uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.3.5
      with:
        target: build/latest.zip
        credentials: ${{ secrets.YOUR_SERVICE_ACCOUNT_CREDENTIALS }}
        parent_folder_id: <YOUR_DRIVE_FOLDER_ID>
        override: true
```

### Upload with custom ownership:
```yaml
steps:
    - uses: actions/checkout@v6

    - name: Upload with Custom Ownership
      uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.3.5
      with:
        target: build/report.pdf
        credentials: ${{ secrets.YOUR_SERVICE_ACCOUNT_CREDENTIALS }}
        parent_folder_id: <YOUR_DRIVE_FOLDER_ID>
        owner: user@yourdomain.com
```

### Using different replace modes:
```yaml
steps:
    - uses: actions/checkout@v6

    - name: Upload with Update-in-Place Strategy
      uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.3.5
      with:
        target: build/latest.zip
        credentials: ${{ secrets.YOUR_SERVICE_ACCOUNT_CREDENTIALS }}
        parent_folder_id: <YOUR_DRIVE_FOLDER_ID>
        replace_mode: update_in_place
```

### Upload and Share with Notification:
```yaml
steps:
    - uses: actions/checkout@v6

    - name: Upload and Share
      uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.3.5
      with:
        target: build/release.zip
        credentials: ${{ secrets.YOUR_SERVICE_ACCOUNT_CREDENTIALS }}
        parent_folder_id: <YOUR_DRIVE_FOLDER_ID>
        share_with: "user1@example.com, user2@example.com"
        send_share_notification: true
```

## ⚙️ Input Parameters

### 🟢 Basic Configuration (Required)

| Input | Description |
|---|---|
| `target` | **Required**. The file(s) you want to upload. Supports glob patterns (e.g., `dist/*.apk`). |
| `credentials` | **Required**. Your Google Service Account JSON. (Paste the **plain JSON** content directly, or Base64 encoded string). |
| `parent_folder_id` | **Required**. The ID of the Google Drive folder where you want to upload. |

### 🟠 Advanced Configuration (Optional)

<details>
<summary>Click to expand advanced options</summary>

| Input | Description |
|---|---|
| `child_folder` | Optional. Name of a subfolder to create/use inside the parent folder. |
| `name` | Optional. Rename the file after upload (only works for single file uploads). |
| `override` | **Legacy**. If `true`, deletes existing files with the same name before upload. (Use `replace_mode` instead). |
| `replace_mode` | Determines how to handle existing files. Options: `delete_first`, `update_in_place`, or `add_new` (default). |
| `max_retention_count` | Number of most recent files *with the same name* to keep. Effectively applies a "Version History" policy per file. Older versions of the specific file are deleted. Set to `0` to disable (default). |
| `convert_files` | If `true`, automatically converts supported files (`.csv`, `.md`, etc.) to Google Docs/Sheets. Default `false`. |
| `share_with` | Comma-separated list of emails to grant "reader" access immediately after upload. |
| `send_share_notification` | If `true`, sends an email notification to the users specified in share_with. Default `false`. |
| `set_metadata` | If `true`, adds GitHub context (Repo, Commit, Run Link) to the file description. Default `false`. |
| `owner` | Optional. Email of the user to impersonate (requires Domain-Wide Delegation). |

</details>

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
  uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.3.5
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
   - Ensure your credentials are valid JSON (copy-pasted from the key file) or Base64 encoded
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

1. **Automatic Dist Updates**: After successful CI runs on the master branch, the `dist/index.js` file is automatically updated.

2. **Creating a Release**:
   - Update the version in `package.json` and `CHANGELOG.md`
   - Commit with the message format: `release: vX.Y.Z` (e.g., `git commit -m "release: v2.3.3"`)
   - Push to master
   - The workflow will automatically:
     - Update `dist/`
     - Create and push the Git Tag
     - Create the GitHub Release with changelog notes

## 🤝 Contributing & Support

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to get started.

### 💖 Support the Project

If this project helped you save time or money, consider supporting its development via **PayPal**:
- **PayPal**: [Donate via PayPal](https://paypal.me/JUMBO810)

- **Need Help?** Check out our [Support Guide](SUPPORT.md).
- **Behavior:** Please adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

## 🔒 Security

For security best practices when using this action, please refer to our [Security Policy](SECURITY.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
