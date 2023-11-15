/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

const actions = require('@actions/core');
const { Glob } = require('glob');
const { google } = require('googleapis');

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

let drive;

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
 * @param {string | null} childFolder
 * @returns {string}
 */
async function getUploadFolderId(parentFolderId, childFolder) {
    actions.debug(`parentFolderId: ${parentFolderId}`);
    actions.debug(`childFolder: ${childFolder}`);
    if (!childFolder) {
        // Empty or null: return parent id
        return parentFolderId;
    }

    const [currentFolder, currentChild] = splitFolder(childFolder);

    actions.debug(`currentFolder: ${currentFolder}`);
    actions.debug(`currentChild: ${currentChild}`);

    // Check if child folder already exists and is unique
    const {
        data: { files },
    } = await drive.files.list({
        q: `name='${currentFolder}' and '${parentFolderId}' in parents and trashed=false`,
        fields: 'files(id)',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
    });

    actions.debug(`files: ${JSON.stringify(files)}`);

    if (files.length > 1) {
        throw new Error('More than one entry match the child folder name');
    }
    if (files.length === 1) {
        // Folder exists, check that folders children
        return getUploadFolderId(files[0].id, currentChild);
    }

    actions.debug(`${currentFolder} does not exist`);

    const currentFolderMetadata = {
        name: currentFolder,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
    };
    const {
        data: { id: currentFolderId },
    } = await drive.files.create({
        requestBody: currentFolderMetadata,
        fields: 'id',
        supportsAllDrives: true,
    });

    actions.debug(`${currentFolder} id: ${currentFolderId}`);

    return getUploadFolderId(currentFolderId, currentChild);
}

/**
 *  Uploads a file from the filesystem
 *
 * @param {string} fileName Name to use in Google Drive
 * @param {string} filePath Path to the file on the filesystem
 * @param {boolean} override Whether or not to remove and replace the current file if it exists
 * @param {string} uploadFolderId Id of the new files parent
 * @returns {Object} Response from the google drive files create api
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
        const { files } = await drive.files.list({
            q: `'${uploadFolderId}' in parents`,
            fields: 'nextPageToken, files(id, name)',
        });

        files.forEach((file) => {
            if (file.name === fileName) {
                const fileId = file.id;

                actions.debug(`Removing ${file.name}(${file.id})`);

                drive.files.delete({ fileId });
            }
        });
    }

    return drive.files.create({
        requestBody: fileMetadata,
        media: fileData,
        uploadType: 'multipart',
        fields: 'id',
        supportsAllDrives: true,
    });
}

async function main() {
    const credentials = getInputAndDebug('credentials', { required: true });
    const parentFolderId = getInputAndDebug('parent_folder_id', { required: true });
    const target = getInputAndDebug('target', { required: true });
    const owner = getInputAndDebug('owner', { required: false });
    const childFolder = getInputAndDebug('child_folder', { required: false });
    const override = getBooleanInputAndDebug('override', { required: false });
    const filename = getInputAndDebug('name', { required: false });

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

    drive = google.drive({ version: 'v3', auth });

    console.log('Getting folder id...');
    const uploadFolderId = await getUploadFolderId(parentFolderId, childFolder);

    actions.debug(`uploadFolderId: ${uploadFolderId}`);

    if (target.includes('*')) {
        const targets = new Glob(target, {});

        for await (const file of targets) {
            const fileName = path.basename(file);
            const filePath = path.resolve(file);

            await uploadFile(fileName, filePath, override, uploadFolderId);
        }
    } else {
        const fileName = filename || path.basename(target);
        const filePath = path.resolve(target);

        await uploadFile(fileName, filePath, override, uploadFolderId);
    }
}

main().catch((error) => actions.setFailed(error));
