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
    const {
        data: { files },
    } = await DRIVE.files.list({
        q: `name='${currentFolder}' and '${parentFolderId}' in parents and trashed=false`,
        fields: 'files(id)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });

    actions.debug(`files: ${JSON.stringify(files)}`);

    if (files.length > 1) {
        throw new Error('More than one entry match the child folder name');
    }
    if (files.length === 1) {
        actions.debug(`${currentFolder} exists inside ${parentFolderId}`);
        // Folder exists, check that folders children
        return getUploadFolderId(files[0].id, remainingFolderPath);
    }

    actions.debug(`${currentFolder} does not exist inside ${parentFolderId}`);

    const currentFolderMetadata = {
        name: currentFolder,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
    };
    const {
        data: { id: currentFolderId },
    } = await DRIVE.files.create({
        requestBody: currentFolderMetadata,
        fields: 'id',
        supportsAllDrives: true,
    });

    actions.debug(`${currentFolder} id: ${currentFolderId}`);

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

    const fileMetadata = {
        name: fileName,
        parents: [uploadFolderId],
    };

    const fileData = {
        body: fs.createReadStream(filePath),
    };

    if (override) {
        const { data: { files } } = await DRIVE.files.list({
            q: `'${uploadFolderId}' in parents and trashed=false`,
            fields: 'nextPageToken, files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        for (const file of files) {
            if (file.name === fileName) {
                const fileId = file.id;

                actions.debug(`Removing ${file.name}(${file.id})`);

                await DRIVE.files.delete({ fileId }, {
                    supportsAllDrives: true,
                });
            }
        }
    }

    actions.debug(`Creating ${fileMetadata.name} in ${fileMetadata.parents[0]}`);

    return DRIVE.files.create({
        requestBody: fileMetadata,
        media: fileData,
        uploadType: 'multipart',
        fields: 'id',
        supportsAllDrives: true,
    });
}

async function main() {
    // Get configuration input
    const credentials = actions.getInput('credentials', { required: true });
    const parentFolderId = getInputAndDebug('parent_folder_id', { required: true });
    const target = getInputAndDebug('target', { required: true });
    const owner = getInputAndDebug('owner', { required: false });
    const childFolder = getInputAndDebug('child_folder', { required: false });
    const override = getBooleanInputAndDebug('override', { required: false });
    const filename = getInputAndDebug('name', { required: false });

    // Authenticate with Google
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

    console.log('Getting folder id...');
    const uploadFolderId = await getUploadFolderId(parentFolderId, childFolder);

    actions.debug(`uploadFolderId: ${uploadFolderId}`);

    if (target.includes('*')) {
        const targets = new Glob(target, {});

        for await (const file of targets) {
            const fileName = path.basename(file);
            const filePath = path.resolve(file);

            if (fs.lstatSync(filePath).isDirectory()) {
                console.log(`Skipping directory ${fileName}`);
                continue;
            }

            await uploadFile(fileName, filePath, override, uploadFolderId);
        }
    } else {
        const fileName = filename || path.basename(target);
        const filePath = path.resolve(target);

        await uploadFile(fileName, filePath, override, uploadFolderId);
    }
}

main().catch((error) => actions.setFailed(error));
