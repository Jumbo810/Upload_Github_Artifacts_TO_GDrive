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
 * Valid replace modes for handling existing files
 */
const REPLACE_MODES = {
    DELETE_FIRST: 'delete_first',
    UPDATE_IN_PLACE: 'update_in_place',
    ADD_NEW: 'add_new',
};

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
 * Validates the replace mode
 * 
 * @param {string} replaceMode - The replace mode to validate
 * @returns {string} The validated replace mode
 * @throws {Error} If the replace mode is invalid
 */
function validateReplaceMode(replaceMode) {
    const mode = replaceMode.toLowerCase();
    const validModes = Object.values(REPLACE_MODES);
    
    if (!validModes.includes(mode)) {
        throw new Error(`Invalid replace_mode: ${replaceMode}. Valid options are: ${validModes.join(', ')}`);
    }
    
    return mode;
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
            q: `name='${currentFolder}' and '${parentFolderId}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'`,
            fields: 'files(id)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });
    };

    const {
        data: { files },
    } = await withRetry(listFilesOperation, `List folders in folder ${parentFolderId}`);

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
 * Find existing files with the same name in the target folder
 * 
 * @param {string} fileName - Name of the file to search for
 * @param {string} uploadFolderId - ID of the folder to search in
 * @returns {Promise<Array<{id: string, name: string}>>} - Array of matching files
 */
async function findExistingFiles(fileName, uploadFolderId) {
    const listFilesOperation = async () => {
        return DRIVE.files.list({
            q: `'${uploadFolderId}' in parents and name='${fileName}' and trashed=false`,
            fields: 'nextPageToken, files(id, name, webViewLink)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });
    };

    const { data: { files } } = await withRetry(
        listFilesOperation, 
        `List files in folder ${uploadFolderId} with name ${fileName}`
    );
    
    return files;
}

/**
 * Delete an existing file
 * 
 * @param {string} fileId - ID of the file to delete
 * @param {string} fileName - Name of the file (for logging)
 * @returns {Promise<void>}
 */
async function deleteFile(fileId, fileName) {
    console.log(`Found existing file '${fileName}'. Removing...`);
    actions.debug(`Removing ${fileName}(${fileId})`);

    const deleteFileOperation = async () => {
        return DRIVE.files.delete({ 
            fileId,
            supportsAllDrives: true,
        });
    };

    await withRetry(deleteFileOperation, `Delete file ${fileName} (${fileId})`);
    console.log(`Existing file '${fileName}' removed successfully.`);
}

/**
 * Update an existing file with new content
 * 
 * @param {string} fileId - ID of the file to update
 * @param {string} fileName - Name of the file
 * @param {string} filePath - Path to the new file content
 * @returns {Promise<import('googleapis').drive_v3.Schema$File>} - Updated file data
 */
async function updateFile(fileId, fileName, filePath) {
    console.log(`Found existing file '${fileName}'. Updating in place...`);
    actions.debug(`Updating ${fileName}(${fileId})`);

    const fileData = {
        body: fs.createReadStream(filePath),
    };

    const updateFileOperation = async () => {
        return DRIVE.files.update({
            fileId,
            media: fileData,
            fields: 'id,name,webViewLink',
            supportsAllDrives: true,
        });
    };

    const result = await withRetry(updateFileOperation, `Update file ${fileName}`);
    console.log(`File '${fileName}' updated successfully. ID: ${result.data.id}`);
    
    if (result.data.webViewLink) {
        console.log(`View file: ${result.data.webViewLink}`);
    }
    
    return result.data;
}

/**
 *  Uploads a file from the filesystem
 *
 * @param {string} fileName Name to use in Google Drive
 * @param {string} filePath Path to the file on the filesystem
 * @param {string} replaceMode How to handle existing files with the same name
 * @param {boolean} override Whether or not to remove and replace the current file if it exists (legacy parameter)
 * @param {string} uploadFolderId Id of the new files parent
 * @returns {Promise<import('googleapis').drive_v3.Schema$File>}
 *          Response from the google drive files create api
 */
async function uploadFile(fileName, filePath, replaceMode, override, uploadFolderId) {
    console.log(`Processing ${fileName} ...`);
    actions.debug(`fileName: ${fileName}`);
    actions.debug(`filePath: ${filePath}`);
    actions.debug(`replaceMode: ${replaceMode}`);
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

    // For backward compatibility, if override is true, use DELETE_FIRST mode
    if (override === true && replaceMode === REPLACE_MODES.ADD_NEW) {
        console.log('Override parameter is set to true, using delete_first replace mode');
        replaceMode = REPLACE_MODES.DELETE_FIRST;
    }

    // Find existing files with the same name
    const existingFiles = await findExistingFiles(fileName, uploadFolderId);
    
    // Handle existing files based on replace mode
    if (existingFiles.length > 0) {
        if (replaceMode === REPLACE_MODES.DELETE_FIRST) {
            // Delete all existing files with the same name
            for (const file of existingFiles) {
                await deleteFile(file.id, file.name);
            }
        } else if (replaceMode === REPLACE_MODES.UPDATE_IN_PLACE) {
            // Update the first file in place and return
            if (existingFiles.length > 1) {
                console.log(`Warning: Multiple files with name '${fileName}' found. Updating the first one.`);
            }
            const updatedFile = await updateFile(existingFiles[0].id, fileName, filePath);
            
            // Set outputs
            actions.setOutput('file_id', updatedFile.id);
            actions.setOutput('file_name', updatedFile.name);
            if (updatedFile.webViewLink) {
                actions.setOutput('web_view_link', updatedFile.webViewLink);
            }
            
            return updatedFile;
        }
        // For ADD_NEW mode, we just proceed with creating a new file
    }

    // Create a new file
    console.log(`Uploading ${fileName} ...`);
    const fileMetadata = {
        name: fileName,
        parents: [uploadFolderId],
    };

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
    
    // Set outputs
    actions.setOutput('file_id', result.data.id);
    actions.setOutput('file_name', result.data.name);
    if (result.data.webViewLink) {
        actions.setOutput('web_view_link', result.data.webViewLink);
    }
    
    return result.data;
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
        let replaceMode = getInputAndDebug('replace_mode', { required: false }) || REPLACE_MODES.ADD_NEW;
        
        // Validate inputs
        validateTarget(target);
        validateCredentials(credentials);
        replaceMode = validateReplaceMode(replaceMode);
        
        // Log all inputs for debugging
        console.log('Input parameters:');
        console.log(`- target: ${target}`);
        console.log(`- parent_folder_id: ${parentFolderId}`);
        console.log(`- child_folder: ${childFolder || '(not set)'}`);
        console.log(`- name: ${filename || '(not set)'}`);
        console.log(`- override: ${override}`);
        console.log(`- replace_mode: ${replaceMode}`);
        
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
        let uploadedFiles = [];

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
                        const uploadedFile = await uploadFile(fileName, filePath, replaceMode, override, uploadFolderId);
                        uploadCount++;
                        uploadedFiles.push(uploadedFile);
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

            const uploadedFile = await uploadFile(fileName, filePath, replaceMode, override, uploadFolderId);
            uploadCount++;
            uploadedFiles.push(uploadedFile);
        }

        console.log(`Upload summary: ${uploadCount} files uploaded successfully, ${errorCount} failures.`);
        
        if (errorCount > 0) {
            actions.setFailed(`${errorCount} file(s) failed to upload.`);
        } else {
            actions.setOutput('upload_count', uploadCount.toString());
            
            // Set outputs for multiple files
            if (uploadedFiles.length > 0) {
                const fileIds = uploadedFiles.map(file => file.id).join(',');
                const fileNames = uploadedFiles.map(file => file.name).join(',');
                const webViewLinks = uploadedFiles
                    .filter(file => file.webViewLink)
                    .map(file => file.webViewLink)
                    .join(',');
                
                actions.setOutput('file_ids', fileIds);
                actions.setOutput('file_names', fileNames);
                if (webViewLinks) {
                    actions.setOutput('web_view_links', webViewLinks);
                }
            }
            
            console.log('All uploads completed successfully.');
        }
    } catch (error) {
        actions.setFailed(`Action failed: ${error.message}`);
    }
}

main();
