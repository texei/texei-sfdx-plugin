// This helper is just a draft for now
// TODO: Do more generic functions, better suffid handling, test folder exists everywhere
// Also maybe some attribute to ask for just name, file name, full name for retrieve
// ex. for record type: MyRecordTypeForAccount, MyRecordTypeForAccount.recordType-meta.xml, Account.MyRecordTypeForAccount
import { SfdxProjectJson } from '@salesforce/core';
import { JsonArray, JsonMap } from '@salesforce/ts-types';
import * as path from 'path';
import * as fs from 'fs';
const util = require('util');

export async function getMetadata(metadata: string) {
    // TODO: ignore some files
    // like .eslintrc.json and jsconfig.json

    const readDir = util.promisify(fs.readdir);
    const metadataPath = path.join('force-app',
                                    'main',
                                    'default',
                                    metadata);

    // TODO: fix it correctly for all metadata types
    let metadatas = [];
    if (fs.existsSync(metadataPath)) {
        metadatas = (await readDir(metadataPath, 'utf8')).map(m => m.replace('.profile-meta.xml',''));
    }

    return metadatas;
}

export async function getFieldsForObject(objectName: string) {

    const readDir = util.promisify(fs.readdir);
    const fieldsPath = path.join('force-app',
                                    'main',
                                    'default',
                                    'objects',
                                    objectName,
                                    'fields');
    
    let fields = [];
    if (fs.existsSync(fieldsPath)) {
        fields = (await readDir(fieldsPath, 'utf8'))
                    .map(f => f.substring(0, f.lastIndexOf('.field-meta.xml')));
    }

    return fields;
}

// TODO: Add format default to all functions
// Expected values: Name, FileName, MetadataApiName --> Is there a way to use an enum (even better for doc)
export async function getRecordTypesForObject(objectName: string, format='MetadataApiName') {

    const readDir = util.promisify(fs.readdir);
    const recordTypesPath = path.join('force-app',
                                    'main',
                                    'default',
                                    'objects',
                                    objectName,
                                    'recordTypes');
    
    let recordTypes = [];
    if (fs.existsSync(recordTypesPath)) {
        recordTypes = (await readDir(recordTypesPath, 'utf8'))
                        .map(rec => {
                            switch(format) {
                                case 'Name': {
                                    return rec.substring(0, rec.lastIndexOf('.recordType-meta.xml'));
                                }
                                case 'FileName': {
                                    return rec;
                                }
                                default: {
                                    //Whether format is not set, is default or is invalid value
                                    //Metadata API Name (for retrieve) will be returned  
                                    return `${objectName}.${rec.substring(0, rec.lastIndexOf('.recordType-meta.xml'))}`;
                                }
                            } 
                        });
    }

    return recordTypes;
}

export async function getCompactLayoutsForObject(objectName: string) {

    const readDir = util.promisify(fs.readdir);
    const compactLayoutsPath = path.join('force-app',
                                    'main',
                                    'default',
                                    'objects',
                                    objectName,
                                    'compactLayouts');
    
    let compactLayouts = [];
    if (fs.existsSync(compactLayoutsPath)) {
        compactLayouts = (await readDir(compactLayoutsPath, 'utf8'))
                            .map(f => f.substring(0, f.lastIndexOf('.compactLayout-meta.xml')));
    }

    return compactLayouts;
}

export async function getLayoutsForObject(objectName: string) {

    const readDir = util.promisify(fs.readdir);
    const layoutsPath = path.join('force-app',
                                    'main',
                                    'default',
                                    'layouts');
    
    let layouts = [];
    if (fs.existsSync(layoutsPath)) {
        layouts = (await readDir(layoutsPath, 'utf8'))
                    .filter(l => l.startsWith(objectName+'-'))
                    .map(l => l.substring(0, l.lastIndexOf('.layout-meta.xml')));
    }

    return layouts;
}

export async function getDefaultProjectPath() {

    let defaultProjectPath = undefined;

    const options = SfdxProjectJson.getDefaultOptions();
    const project = await SfdxProjectJson.create(options);

    const packageDirectories = project.get('packageDirectories') as JsonArray || [];
    for (let packageDirectory of packageDirectories) {
        
        packageDirectory = packageDirectory as JsonMap;
        if (packageDirectory.default) {
            defaultProjectPath = packageDirectory.path;
        }
    }

    return defaultProjectPath;
}