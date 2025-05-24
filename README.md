# Upload Github Artifacts TO GDrive

[![GitHub release](https://img.shields.io/github/v/release/Jumbo810/Upload_Github_Artifacts_TO_GDrive)](https://github.com/Jumbo810/Upload_Github_Artifacts_TO_GDrive/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/Jumbo810/Upload_Github_Artifacts_TO_GDrive/actions/workflows/ci.yml/badge.svg)](https://github.com/Jumbo810/Upload_Github_Artifacts_TO_GDrive/actions/workflows/ci.yml)

Github Action To Upload Artifacts to Google Drive Using A Google Drive Api.

## Features

- Upload files from your GitHub workflow to Google Drive
- Support for uploading multiple files using glob patterns
- Create nested folders automatically
- Option to override existing files
- Support for custom file naming
- Secure handling of Google Drive credentials

## Usage

### Simple example:
```yaml
steps:
    - uses: actions/checkout@v4.1.1

    - name: Upload Artifacts TO Google Drive
      uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.2.3
      with:
        target: <LOCAL_PATH_TO_YOUR_FILE>
        credentials: ${{ secrets.YOUR_SERVICE_ACCOUNT_CREDENTIALS }}
        parent_folder_id: <YOUR_DRIVE_FOLDER_ID>
```

### Upload multiple files using glob pattern:
```yaml
steps:
    - uses: actions/checkout@v4.1.1

    - name: Upload Multiple Files TO Google Drive
      uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.2.3
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
      uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.2.3
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
      uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.2.3
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
      uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.2.3
      with:
        target: build/report.pdf
        credentials: ${{ secrets.YOUR_SERVICE_ACCOUNT_CREDENTIALS }}
        parent_folder_id: <YOUR_DRIVE_FOLDER_ID>
        owner: user@yourdomain.com
```

## Inputs

### `target` (Required):
Local path to the file to upload, can be relative from github runner current directory.

You can also specify a glob pattern to upload multiple files at once (this will cause the name property to be ignored).

### `credentials` (Required):
A service account public/private key pair encoded in base64.

[Generate and download your credentials in JSON format](https://cloud.google.com/iam/docs/creating-managing-service-account-keys#creating_service_account_keys)

Run `base64 my_service_account_key.json > encoded.txt` and paste the encoded string into a github secret.

### `parent_folder_id` (Required):
The id of the drive folder where you want to upload your file. It is the string of characters after the last `/` when browsing to your folder URL. You must share the folder with the service account (using its email address) unless you specify a `owner`.

### `name` (Optional):
The name of the file to be uploaded. Set to the `target` filename if not specified. (Ignored if target contains a glob `*` or `**`)

### `child_folder` (Optional):
A sub-folder where to upload your file. It will be created if non-existent and must remain unique. Useful to organize your drive like so:

```
📂 Release // parent folder
 ┃
 ┣ 📂 v1.0 // child folder
 ┃ └ 📜 uploaded_file_v1.0
 ┃
 ┣ 📂 v2.0 // child folder
 ┃ └ 📜 uploaded_file_v2.0
```

### `owner` (Optional):
The email address of a user account that has access to the drive folder and will get the ownership of the file after its creation. To use this feature you must grant your service account a [domain-wide delegation of authority](https://developers.google.com/admin-sdk/directory/v1/guides/delegation) beforehand.

### `override` (Optional):
If set true, delete files with the same name before uploading.

## Setting Up Google Drive API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API
4. Create a service account
5. Create a key for the service account (JSON format)
6. Base64 encode the JSON key file
7. Store the encoded key in a GitHub Secret
8. Share your Google Drive folder with the service account email

## Troubleshooting

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

## Security

For security best practices when using this action, please refer to our [Security Policy](SECURITY.md).

## License

This project is licensed under the MIT License - see the LICENSE file for details.
