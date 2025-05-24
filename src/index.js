/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

const actions = require('@actions/core');
const { Glob } = require('glob');
const { google } = require('googleapis');

/**
 * Global static reference to the Google Drive API
 *
 * @type {import('googleapis').drive_v3.Drive}
 */
let DRIVE;

/**
 * Maximum number of retry attempts for API operations
 */
const MAX_RETRIES = 3;

/**
 * Base delay for exponential backoff (in milliseconds)
 */
const BASE_RETRY_DELAY = 1000;

/**
 * Get input value and log value to debug
 *
 * @param {string} name
 * @param {actions.InputOptions | undefined} options
 * @returns {string}
 */
function getInputAndDebug(name, options) {
    const val = actions.getInput(name, options);

    actions.debug(`${name}: ${val}`);
    return val;
}

/**
 * Get input value and log value to debug
 *
 * @param {string} name
 * @param {actions.InputOptions | undefined} options
 * @returns {boolean}
 */
function getBooleanInputAndDebug(name, options) {
    const val = actions.getBooleanInput(name, options);

    actions.debug(`${name}: ${val}`);
    return val;
}

/**
 * Sleep for a specified number of milliseconds
 * 
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 * 
 * @template T
 * @param {function(): Promise<T>} fn - Function to execute
 * @param {string} operationName - Name of the operation for logging
 * @param {number} [maxRetries=MAX_RETRIES] - Maximum number of retry attempts
 * @param {number} [baseDelay=BASE_RETRY_DELAY] - Base delay for exponential backoff
 * @returns {Promise<T>}
 */
async function withRetry(fn, operationName, maxRetries = MAX_RETRIES, baseDelay = BASE_RETRY_DELAY) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt - 1);
                console.log(`${operationName} failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);
                actions.warning(`${operationName} failed: ${error.message}. Retrying...`);
                await sleep(delay);
            }
        }
    }
    
    throw new Error(`${operationName} failed after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Validates that the input file or pattern exists
 * 
 * @param {string} target - File path or glob pattern
 * @throws {Error} If the target doesn't exist
 */
function validateTarget(target) {
    if (target.includes('*')) {
        // For glob patterns, we'll check if any files match during processing
        return;
    }
    
    const resolvedPath = path.resolve(target);
    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Target file not found: ${resolvedPath}`);
    }
}

/**
 * Validates the credentials format
 * 
 * @param {string} credentials - Base64 encoded credentials
 * @throws {Error} If the credentials are invalid
 */
function validateCredentials(credentials) {
    try {
        const decoded = Buffer.from(credentials, 'base64').toString();
        const parsed = JSON.parse(decoded);
        
        if (!parsed.client_email || !parsed.private_key) {
            throw new Error('Missing required fields in credentials');
        }
    } catch (error) {
        throw new Error(`Invalid credentials format: ${error.message}`);
    }
}

/**
 * Splits off the top level folder and returns a tuple of [head, rest]
 *
 * @example
 * // returns ['home', 'user/.config']
 * splitFolder('home/user/.config')
 * @example
 * // returns ['.config', null]
 * splitFolder('.config')
 * @param {string} folder
 * @returns {[string, string | null]}
 */
function splitFolder(folder) {
    if (folder.includes('/')) {
        const indexOfDelimiter = folder.indexOf('/');
        const currentFolder = folder.substring(0, indexOfDelimiter);
        const currentChild = folder.substring(indexOfDelimiter + 1);

        return [currentFolder, currentChild];
    } else {
        return [folder, null];
    }
}

/**
 * Return the id of the child folder and create the directories if they are missing
 *
 * @param {string} parentFolderId Id of the parent directory
 * @param {string | null} childFolderPath
 * @returns {Promise<string>}
 */
async function getUploadFolderId(parentFolderId, childFolderPath) {
    actions.debug(`parentFolderId: ${parentFolderId}`);
    actions.debug(`childFolderPath: ${childFolderPath}`);
    if (!childFolderPath) {
        // Empty or null: return parent id
        return parentFolderId;
    }

    const [currentFolder, remainingFolderPath] = splitFolder(childFolderPath);

    actions.debug(`currentFolder: ${currentFolder}`);
    actions.debug(`remainingFolderPath: ${remainingFolderPath}`);

    // Check if child folder already exists and is unique
    const listFilesOperation = async () => {
        return DRIVE.files.list({
            q: `name='${currentFolder}' and '${parentFolderId}' in parents and trashed=false`,
            fields: 'files(id)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });
    };

    const {
        data: { files },
    } = await withRetry(listFilesOperation, `List files in folder ${parentFolderId}`);

    actions.debug(`files: ${JSON.stringify(files)}`);

    if (files.length > 1) {
        throw new Error(`More than one folder named '${currentFolder}' found in parent folder ${parentFolderId}`);
    }
    if (files.length === 1) {
        actions.debug(`${currentFolder} exists inside ${parentFolderId}`);
        // Folder exists, check that folders children
        return getUploadFolderId(files[0].id, remainingFolderPath);
    }

    actions.debug(`${currentFolder} does not exist inside ${parentFolderId}`);
    console.log(`Creating folder '${currentFolder}'...`);

    const currentFolderMetadata = {
        name: currentFolder,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
    };

    const createFolderOperation = async () => {
        return DRIVE.files.create({
            requestBody: currentFolderMetadata,
            fields: 'id',
            supportsAllDrives: true,
        });
    };

    const {
        data: { id: currentFolderId },
    } = await withRetry(createFolderOperation, `Create folder ${currentFolder}`);

    actions.debug(`${currentFolder} id: ${currentFolderId}`);
    console.log(`Folder '${currentFolder}' created successfully.`);

    return getUploadFolderId(currentFolderId, remainingFolderPath);
}

/**
 *  Uploads a file from the filesystem
 *
 * @param {string} fileName Name to use in Google Drive
 * @param {string} filePath Path to the file on the filesystem
 * @param {boolean} override Whether or not to remove and replace the current file if it exists
 * @param {string} uploadFolderId Id of the new files parent
 * @returns {Promise<import('googleapis').drive_v3.Schema$File>}
 *          Response from the google drive files create api
 */
async function uploadFile(fileName, filePath, override, uploadFolderId) {
    console.log(`Uploading ${fileName} ...`);
    actions.debug(`fileName: ${fileName}`);
    actions.debug(`filePath: ${filePath}`);
    actions.debug(`override: ${override}`);
    actions.debug(`uploadFolderId: ${uploadFolderId}`);

    // Validate file exists and is readable
    try {
        await fs.promises.access(filePath, fs.constants.R_OK);
    } catch (error) {
        throw new Error(`Cannot access file ${filePath}: ${error.message}`);
    }

    const fileStats = await fs.promises.stat(filePath);
    console.log(`File size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

    const fileMetadata = {
        name: fileName,
        parents: [uploadFolderId],
    };

    if (override) {
        const listFilesOperation = async () => {
            return DRIVE.files.list({
                q: `'${uploadFolderId}' in parents and name='${fileName}' and trashed=false`,
                fields: 'nextPageToken, files(id, name)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
            });
        };

        const { data: { files } } = await withRetry(
            listFilesOperation, 
            `List files in folder ${uploadFolderId} with name ${fileName}`
        );

        for (const file of files) {
            const fileId = file.id;
            console.log(`Found existing file '${file.name}'. Removing...`);
            actions.debug(`Removing ${file.name}(${file.id})`);

            const deleteFileOperation = async () => {
                return DRIVE.files.delete({ 
                    fileId,
                    supportsAllDrives: true,
                });
            };

            await withRetry(deleteFileOperation, `Delete file ${file.name} (${file.id})`);
            console.log(`Existing file '${file.name}' removed successfully.`);
        }
    }

    actions.debug(`Creating ${fileMetadata.name} in ${fileMetadata.parents[0]}`);

    const fileData = {
        body: fs.createReadStream(filePath),
    };

    const createFileOperation = async () => {
        return DRIVE.files.create({
            requestBody: fileMetadata,
            media: fileData,
            uploadType: 'multipart',
            fields: 'id,name,webViewLink',
            supportsAllDrives: true,
        });
    };

    const result = await withRetry(createFileOperation, `Upload file ${fileName}`);
    console.log(`File '${fileName}' uploaded successfully. ID: ${result.data.id}`);
    
    if (result.data.webViewLink) {
        console.log(`View file: ${result.data.webViewLink}`);
    }
    
    return result;
}

async function main() {
    try {
        // Get configuration input
        const credentials = actions.getInput('credentials', { required: true });
        const parentFolderId = getInputAndDebug('parent_folder_id', { required: true });
        const target = getInputAndDebug('target', { required: true });
        const owner = getInputAndDebug('owner', { required: false });
        const childFolder = getInputAndDebug('child_folder', { required: false });
        const override = getBooleanInputAndDebug('override', { required: false });
        const filename = getInputAndDebug('name', { required: false });

        // Validate inputs
        validateTarget(target);
        validateCredentials(credentials);

        // Authenticate with Google
        console.log('Authenticating with Google Drive API...');
        const credentialsJSON = JSON.parse(
            Buffer.from(credentials, 'base64').toString(),
        );
        const scopes = [
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/drive.file',
        ];
        const auth = new google.auth.JWT(
            credentialsJSON.client_email,
            null,
            credentialsJSON.private_key,
            scopes,
            owner,
        );

        // Set global `drive`
        DRIVE = google.drive({ version: 'v3', auth });

        // Test authentication
        try {
            await DRIVE.about.get({ fields: 'user' });
            console.log('Authentication successful.');
        } catch (error) {
            throw new Error(`Authentication failed: ${error.message}`);
        }

        console.log('Getting folder id...');
        const uploadFolderId = await getUploadFolderId(parentFolderId, childFolder);

        actions.debug(`uploadFolderId: ${uploadFolderId}`);

        let uploadCount = 0;
        let errorCount = 0;

        if (target.includes('*')) {
            console.log(`Finding files matching pattern: ${target}`);
            const targets = new Glob(target, {});
            const matchedFiles = [];

            for await (const file of targets) {
                matchedFiles.push(file);
            }

            if (matchedFiles.length === 0) {
                throw new Error(`No files found matching pattern: ${target}`);
            }

            console.log(`Found ${matchedFiles.length} files to upload.`);

            for (const file of matchedFiles) {
                const fileName = path.basename(file);
                const filePath = path.resolve(file);

                if (!fs.lstatSync(filePath).isDirectory()) {
                    try {
                        await uploadFile(fileName, filePath, override, uploadFolderId);
                        uploadCount++;
                    } catch (error) {
                        console.error(`Error uploading ${fileName}: ${error.message}`);
                        actions.error(`Failed to upload ${fileName}: ${error.message}`);
                        errorCount++;
                    }
                } else {
                    console.log(`Skipping directory ${fileName}`);
                }
            }
        } else {
            const fileName = filename || path.basename(target);
            const filePath = path.resolve(target);

            if (fs.lstatSync(filePath).isDirectory()) {
                throw new Error(`Target is a directory: ${filePath}. Please specify a file or use a glob pattern.`);
            }

            await uploadFile(fileName, filePath, override, uploadFolderId);
            uploadCount++;
        }

        console.log(`Upload summary: ${uploadCount} files uploaded successfully, ${errorCount} failures.`);
        
        if (errorCount > 0) {
            actions.setFailed(`${errorCount} file(s) failed to upload.`);
        } else {
            actions.setOutput('upload_count', uploadCount.toString());
            console.log('All uploads completed successfully.');
        }
    } catch (error) {
        actions.setFailed(`Action failed: ${error.message}`);
    }
}

main();
