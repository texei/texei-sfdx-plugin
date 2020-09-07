"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var command_1 = require("@salesforce/command");
var core_1 = require("@salesforce/core");
var fs = require("fs");
var path = require("path");
// Initialize Messages with the current plugin directory
core_1.Messages.importMessagesDirectory(__dirname);
// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
var messages = core_1.Messages.loadMessages('texei-sfdx-plugin', 'data-export');
var conn;
var objectList;
var Export = /** @class */ (function (_super) {
    __extends(Export, _super);
    function Export() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Export.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var recordIdsMap, index, _i, objectList_1, objectName, fileName, objectRecords, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
                        conn = this.org.getConnection();
                        recordIdsMap = new Map();
                        objectList = this.flags.objects.split(',');
                        index = 1;
                        _i = 0, objectList_1 = objectList;
                        _b.label = 1;
                    case 1:
                        if (!(_i < objectList_1.length)) return [3 /*break*/, 5];
                        objectName = objectList_1[_i];
                        this.ux.startSpinner("Exporting " + objectName);
                        fileName = index + "-" + objectName + ".json";
                        objectRecords = {};
                        _a = objectRecords;
                        return [4 /*yield*/, this.getsObjectRecords(objectName, null, recordIdsMap)];
                    case 2:
                        _a.records = _b.sent();
                        return [4 /*yield*/, this.saveFile(objectRecords, fileName)];
                    case 3:
                        _b.sent();
                        index++;
                        this.ux.stopSpinner(fileName + " saved.");
                        _b.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 1];
                    case 5: return [2 /*return*/, { message: 'Data exported' }];
                }
            });
        });
    };
    Export.prototype.getsObjectRecords = function (sobjectName, fieldsToExclude, recordIdsMap) {
        return __awaiter(this, void 0, void 0, function () {
            var fields, lookups, userFieldsReference, describeResult, sObjectLabel, _i, _a, field, recordQuery, recordResults;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        fields = [];
                        lookups = [];
                        userFieldsReference = [];
                        return [4 /*yield*/, conn.sobject(sobjectName).describe()];
                    case 1:
                        describeResult = _b.sent();
                        sObjectLabel = describeResult.label;
                        // Just in case fieldsToExclude is passed as null
                        if (!fieldsToExclude) {
                            fieldsToExclude = [];
                        }
                        for (_i = 0, _a = describeResult.fields; _i < _a.length; _i++) {
                            field = _a[_i];
                            if (field.createable && !fieldsToExclude.includes(field.name)) {
                                fields.push(field.name);
                                // If it's a lookup, also add it to the lookup list, to be replaced later
                                // Excluding OwnerId as we are not importing users anyway
                                if (field.referenceTo && field.referenceTo.length > 0 && field.name != 'OwnerId' && field.name != 'RecordTypeId') {
                                    // If User is queried, use the reference, otherwise use the Scratch Org User
                                    if (!objectList.includes('User') && field.referenceTo.includes('User')) {
                                        userFieldsReference.push(field.name);
                                    }
                                    else {
                                        lookups.push(field.name);
                                    }
                                }
                            }
                        }
                        // Add RecordType.DeveloperName to the query if there are Record Types for this object
                        if (describeResult.recordTypeInfos.length > 1) {
                            // Looks like that there is always at least 1 RT (Master) returned by the describe
                            // So having more than 2 means there are some custom RT created 
                            // Is there a better way to do this ?
                            fields.push('RecordType.DeveloperName');
                        }
                        recordQuery = "SELECT Id, " + fields.join() + "\n                         FROM " + sobjectName;
                        return [4 /*yield*/, conn.autoFetchQuery(recordQuery)];
                    case 2:
                        recordResults = (_b.sent()).records;
                        // Replace Lookup Ids + Record Type Ids by references
                        return [4 /*yield*/, this.cleanJsonRecordLookup(sObjectLabel, recordResults, recordIdsMap, lookups, userFieldsReference)];
                    case 3:
                        // Replace Lookup Ids + Record Type Ids by references
                        _b.sent();
                        return [2 /*return*/, recordResults];
                }
            });
        });
    };
    // Clean JSON to have the same output format as force:data:tree:export
    // Main difference: RecordTypeId is replaced by DeveloperName
    Export.prototype.cleanJsonRecordLookup = function (objectLabel, records, recordIdsMap, lookups, userFieldsReference) {
        return __awaiter(this, void 0, void 0, function () {
            var refId, _i, records_1, record, _a, lookups_1, lookup, _b, userFieldsReference_1, userField;
            return __generator(this, function (_c) {
                refId = 1;
                for (_i = 0, records_1 = records; _i < records_1.length; _i++) {
                    record = records_1[_i];
                    // Delete record url, useless to reimport somewhere else
                    delete record.attributes.url;
                    // Add the new ReferenceId
                    record.attributes.referenceId = objectLabel + "Ref" + refId;
                    recordIdsMap.set(record.Id, record.attributes.referenceId);
                    // Replace lookup Ids
                    for (_a = 0, lookups_1 = lookups; _a < lookups_1.length; _a++) {
                        lookup = lookups_1[_a];
                        record[lookup] = recordIdsMap.get(record[lookup]);
                    }
                    // Replace RecordTypeId with DeveloperName, to replace later with newly generated Id
                    if (record.RecordTypeId && record.RecordType) {
                        record.RecordTypeId = record.RecordType.DeveloperName;
                    }
                    // If User is queried, use the reference, otherwise use the Scratch Org User
                    for (_b = 0, userFieldsReference_1 = userFieldsReference; _b < userFieldsReference_1.length; _b++) {
                        userField = userFieldsReference_1[_b];
                        record[userField] = 'SfdxOrgUser';
                    }
                    // Delete unused fields
                    delete record.Id;
                    delete record.RecordType;
                    delete record.OwnerId;
                    refId++;
                }
                return [2 /*return*/];
            });
        });
    };
    Export.prototype.saveFile = function (records, fileName) {
        return __awaiter(this, void 0, void 0, function () {
            var filePath, saveToPath;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        filePath = fileName;
                        if (this.flags.outputdir) {
                            filePath = path.join(this.flags.outputdir, fileName);
                        }
                        saveToPath = path.join(process.cwd(), filePath);
                        return [4 /*yield*/, fs.writeFile(saveToPath, JSON.stringify(records, null, 2), 'utf8', function (err) {
                                if (err) {
                                    throw new core_1.SfdxError("Unable to write file at path " + saveToPath + ": " + err);
                                }
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Export.description = messages.getMessage('commandDescription');
    Export.examples = [
        "$ sfdx texei:data:export --objects Account,Contact,MyCustomObject__c --outputdir ./data --targetusername texei\n  Data exported!\n  "
    ];
    Export.flagsConfig = {
        objects: command_1.flags.string({ char: 'o', description: messages.getMessage('objectsFlagDescription'), required: true }),
        outputdir: command_1.flags.string({ char: 'd', description: messages.getMessage('outputdirFlagDescription'), required: true })
    };
    // Comment this out if your command does not require an org username
    Export.requiresUsername = true;
    // Comment this out if your command does not support a hub org username
    Export.requiresDevhubUsername = false;
    // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
    Export.requiresProject = false;
    return Export;
}(command_1.SfdxCommand));
exports["default"] = Export;
