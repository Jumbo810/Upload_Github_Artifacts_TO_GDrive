# Upload Github Artifacts TO GDrive
Github Action To Upload Artifacts to Google Drive Using A Google Drive Api.

## Usage
#### Simple example:
```
steps:
    - uses: actions/checkout@v4.1.1

    - name: Upload Artifacts TO Google Drive
      uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.3.0
      with:
        target: <LOCAL_PATH_TO_YOUR_FILE>
        credentials: ${{ secrets.<YOUR_SERVICE_ACCOUNT_CREDENTIALS> }}
        parent_folder_id: <YOUR_DRIVE_FOLDER_ID>
```

### Inputs
#### `target` (Required):
Local path to the file to upload, can be relative from github runner current directory.

You can also specify a glob pattern to upload multiple files at once (this will cause the name property to be ignored).

#### `credentials` (Required):
A service account public/private key pair encoded in base64.

[Generate and download your credentials in JSON format](https://cloud.google.com/iam/docs/creating-managing-service-account-keys#creating_service_account_keys)

Run `base64 my_service_account_key.json > encoded.txt` and paste the encoded string into a github secret.

#### `parent_folder_id` (Required):
The id of the drive folder where you want to upload your file. It is the string of characters after the last `/` when browsing to your folder URL. You must share the folder with the service account (using its email address) unless you specify a `owner`.

#### `name` (Optional):
The name of the file to be uploaded. Set to the `target` filename if not specified. (Ignored if target contains a glob `*` or `**`)

#### `child_folder` (Optional):
A sub-folder where to upload your file. It will be created if non-existent and must remain unique. Useful to organize your drive like so:

```
📂 Release // parent folder
 ┃
 ┣ 📂 v1.0 // child folder
 ┃ ┗ 📜 uploaded_file_v1.0
 ┃
 ┣ 📂 v2.0 // child folder
 ┃ ┗ 📜 uploaded_file_v2.0
```

#### `owner` (Optional):
The email address of a user account that has access to the drive folder and will get the ownership of the file after its creation. To use this feature you must grant your service account a [domain-wide delegation of authority](https://developers.google.com/admin-sdk/directory/v1/guides/delegation) beforehand.

#### `override` (Optional):
If set true, delete files with the same name before uploading.

#### `replace_mode` (Optional):
Determines how to handle existing files with the same name. Options:
- `delete_first`: Delete existing files before uploading (same as override=true)
- `update_in_place`: Update the existing file in place, preserving file ID and sharing links
- `add_new`: Create a new file even if one with the same name exists (default)

### Outputs

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
  uses: Jumbo810/Upload_Github_Artifacts_TO_GDrive@v2.3.0
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

## Release Process
