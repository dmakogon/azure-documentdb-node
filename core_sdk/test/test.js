//----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
//----------------------------------------------------------------------------

"use strict";

var Base = require("documentdb").Base
  , DocumentDBClient = require("documentdb").DocumentClient
  , DocumentBase = require("documentdb").DocumentBase
  , Constants = require("documentdb").Constants
  , assert = require("assert")
  , testConfig = require("./_testConfig")
  , Stream = require("stream");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var host = testConfig.host;
var masterKey = testConfig.masterKey;

describe("NodeJS CRUD Tests", function() {

    // remove all databases from the endpoint before each test
    beforeEach(function(done) {
        var client = new DocumentDBClient(host, {masterKey: masterKey});
        client.readDatabases().toArray(function(err, databases) {
            if (err !== undefined) {
                console.log("An error occured", err);
                return done();
            }

            var length = databases.length;

            if(length === 0) {
                return done();
            }

            var count = 0;
            databases.forEach(function(database) {
                client.deleteDatabase(database._self, function(err, db) {
                    if (err !== undefined) {
                        console.log("An error occured", err);
                        return done();
                    }

                    count++;
                    if(count === length) {
                        done();
                    }
                });
            });
        });
    });

    var getDatabaseLink = function (isNameBasedLink, db) {
        if (isNameBasedLink) {
            return "dbs/" + db.id;
        } else {
            return db._self;
        }
    };

    var getCollectionLink = function (isNameBasedLink, db, coll) {
        if (isNameBasedLink) {
            return "dbs/" + db.id + "/colls/" + coll.id;
        } else {
            return coll._self;
        }
    };

    var getDocumentLink = function (isNameBasedLink, db, coll, doc) {
        if (isNameBasedLink) {
            return "dbs/" + db.id + "/colls/" + coll.id + "/docs/" + doc.id;
        } else {
            return doc._self;
        }
    };

    var getAttachmentLink = function (isNameBasedLink, db, coll, doc, attachment) {
        if (isNameBasedLink) {
            return "dbs/" + db.id + "/colls/" + coll.id + "/docs/" + doc.id + "/attachments/" + attachment.id;
        } else {
            return attachment._self;
        }
    };

    var getUserLink = function (isNameBasedLink, db, user) {
        if (isNameBasedLink) {
            return "dbs/" + db.id + "/users/" + user.id;
        } else {
            return user._self;
        }
    };

    var getPermissionLink = function (isNameBasedLink, db, user, permission) {
        if (isNameBasedLink) {
            return "dbs/" + db.id + "/users/" + user.id + "/permissions/" + permission.id;
        } else {
            return permission._self;
        }
    };

    var getTriggerLink = function (isNameBasedLink, db, coll, trigger) {
        if (isNameBasedLink) {
            return "dbs/" + db.id + "/colls/" + coll.id + "/triggers/" + trigger.id;
        } else {
            return trigger._self;
        }
    };

    var getUserDefinedFunctionLink = function (isNameBasedLink, db, coll, udf) {
        if (isNameBasedLink) {
            return "dbs/" + db.id + "/colls/" + coll.id + "/udfs/" + udf.id;
        } else {
            return udf._self;
        }
    };

    var getStoredProcedureLink = function (isNameBasedLink, db, coll, sproc) {
        if (isNameBasedLink) {
            return "dbs/" + db.id + "/colls/" + coll.id + "/sprocs/" + sproc.id;
        } else {
            return sproc._self;
        }
    };

    var getConflictLink = function (isNameBasedLink, db, coll, conflict) {
        if (isNameBasedLink) {
            return "dbs/" + db.id + "/colls/" + coll.id + "/conflicts/" + conflict.id;
        } else {
            return conflict._self;
        }
    };

    describe("Validate Database CRUD", function () {
        var databaseCRUDTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            // read databases
            client.readDatabases().toArray(function (err, databases) {
                assert.equal(err, undefined, "error reading databases");
                assert.equal(databases.constructor, Array, "Value should be an array");
                // create a database
                var beforeCreateDatabasesCount = databases.length;
                var databaseDefinition = { id: "sample database" };
                client.createDatabase(databaseDefinition, function (err, db) {
                    assert.equal(err, undefined, "error creating database");
                    assert.equal(db.id, databaseDefinition.id);
                    // read databases after creation
                    client.readDatabases().toArray(function (err, databases) {
                        assert.equal(err, undefined, "error reading databases");
                        assert.equal(databases.length, beforeCreateDatabasesCount + 1, "create should increase the number of databases");
                        // query databases
                        var querySpec = {
                            query: "SELECT * FROM root r WHERE r.id=@id",
                            parameters: [
                                {
                                    name: "@id",
                                    value: databaseDefinition.id
                                }
                            ]
                        };
                        client.queryDatabases(querySpec).toArray(function (err, results) {
                            assert.equal(err, undefined, "error querying databases");
                            assert(results.length > 0, "number of results for the query should be > 0");

                            // delete database
                            client.deleteDatabase(getDatabaseLink(isNameBased, db), function (err, res) {
                                assert.equal(err, undefined, "error deleting database");
                                // read database after deletion
                                client.readDatabase(getDatabaseLink(isNameBased, db), function (err, database) {
                                    var notFoundErrorCode = 404;
                                    assert.equal(err.code, notFoundErrorCode, "response should return error code 404");
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        };

        it("[nativeApi] Should do database CRUD operations successfully [name based]", function(done) {
            databaseCRUDTest(true, done);
        });

        it("[nativeApi] Should do database CRUD operations successfully [rid based]", function (done) {
            databaseCRUDTest(false, done);
        });
    });

    describe("Validate Queries CRUD", function () {
        var queriesCRUDTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            // create a database
            var databaseDefinition = { id: "sample database" };
            client.createDatabase(databaseDefinition, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                assert.equal(db.id, databaseDefinition.id);
                // query databases
                var querySpec0 = {
                    query: "SELECT * FROM root r WHERE r.id=@id",
                    parameters: [
                        {
                            name: "@id",
                            value: databaseDefinition.id
                        }
                    ]
                };
                client.queryDatabases(querySpec0).toArray(function (err, results) {
                    assert.equal(err, undefined, "error querying databases");
                    assert(results.length > 0, "number of results for the query should be > 0");
                    var querySpec1 = {
                        query: "SELECT * FROM root r WHERE r.id='" + databaseDefinition.id + "'"
                    };
                    client.queryDatabases(querySpec1).toArray(function (err, results) {
                        assert.equal(err, undefined, "error creating databases");
                        assert(results.length > 0, "number of results for the query should be > 0");
                        var querySpec2 = "SELECT * FROM root r WHERE r.id='" + databaseDefinition.id + "'";
                        client.queryDatabases(querySpec2).toArray(function (err, results) {
                            assert.equal(err, undefined, "error querying databases");
                            assert(results.length > 0, "number of results for the query should be > 0");
                            done();
                        });
                    });
                });
            });
        };

        it("[nativeApi] Should do queries CRUD operations successfully [name based]", function (done) {
            queriesCRUDTest(true, done);
        });

        it("[nativeApi] Should do queries CRUD operations successfully [rid based]", function (done) {
            queriesCRUDTest(false, done);
        });
    });

    describe("Validate Collection CRUD", function () {
        var collectionCRUDTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            // create database
            client.createDatabase({ id: "sample database" }, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                client.readCollections(getDatabaseLink(isNameBased, db)).toArray(function (err, collections) {
                    assert.equal(err, undefined, "error reading collections");
                    assert.equal(collections.constructor, Array, "Value should be an array");
                    // create a collection
                    var beforeCreateCollectionsCount = collections.length;
                    var collectionDefinition = { id: "sample collection", indexingPolicy: { indexingMode: "Consistent" } };
                    client.createCollection(getDatabaseLink(isNameBased, db), collectionDefinition, function (err, collection) {
                        assert.equal(err, undefined, "error creatong collection");
                        assert.equal(collectionDefinition.id, collection.id);
                        assert.equal("consistent", collection.indexingPolicy.indexingMode);
                        // read collections after creation
                        client.readCollections(getDatabaseLink(isNameBased, db)).toArray(function (err, collections) {
                            assert.equal(err, undefined, "error reading collections");
                            assert.equal(collections.length, beforeCreateCollectionsCount + 1, "create should increase the number of collections");
                            // query collections
                            var querySpec = {
                                query: "SELECT * FROM root r WHERE r.id=@id",
                                parameters: [
                                    {
                                        name: "@id",
                                        value: collectionDefinition.id
                                    }
                                ]
                            };
                            client.queryCollections(getDatabaseLink(isNameBased, db), querySpec).toArray(function (err, results) {
                                assert.equal(err, undefined, "error querying collections");
                                assert(results.length > 0, "number of results for the query should be > 0");

                                // Replacing indexing policy is allowed.
                                collection.indexingPolicy.indexingMode = "Lazy";
                                client.replaceCollection(getCollectionLink(isNameBased, db, collection), collection, function (err, replacedCollection) {
                                    assert.equal(err, undefined, "replaceCollection should work successfully");
                                    assert.equal("lazy", replacedCollection.indexingPolicy.indexingMode);

                                    // Replacing id is not allowed.
                                    collection.id = "try_to_replace_id";
                                    client.replaceCollection(getCollectionLink(isNameBased, db, collection), collection, function (err, replacedCollection) {
                                        if (isNameBased) {
                                            var notFoundErrorCode = 404;
                                            assert.equal(err.code, notFoundErrorCode, "response should return error code 404");
                                        } else {
                                            var badRequestErrorCode = 400;
                                            assert.equal(err.code, badRequestErrorCode, "response should return error code 400");
                                        }
                                        // read collection
                                        collection.id = collectionDefinition.id;  // Resume Id.
                                        client.readCollection(getCollectionLink(isNameBased, db, collection), function (err, collection) {
                                            assert.equal(err, undefined, "readCollection should work successfully");
                                            assert.equal(collectionDefinition.id, collection.id);
                                            // delete collection
                                            client.deleteCollection(getCollectionLink(isNameBased, db, collection), function (err, res) {
                                                assert.equal(err, undefined, "error deleting collection");
                                                // read collection after deletion
                                                client.readCollection(getCollectionLink(isNameBased, db, collection), function (err, collection) {
                                                    var notFoundErrorCode = 404;
                                                    assert.equal(err.code, notFoundErrorCode, "response should return error code 404");
                                                    done();
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        };

        it("[nativeApi] Should do collection CRUD operations successfully [name based]", function(done) {
            collectionCRUDTest(true, done);
        });

        it("[nativeApi] Should do collection CRUD operations successfully [rid based]", function (done) {
            collectionCRUDTest(false, done);
        });
    });

    describe("Validate Document CRUD", function () {
        var documentCRUDTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            // create database
            client.createDatabase({ id: "sample 中文 database" }, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                // create collection
                client.createCollection("dbs/sample 中文 database", { id: "sample collection" }, function (err, collection) {
                    assert.equal(err, undefined, "error creating collection");
                    // read documents
                    client.readDocuments(getCollectionLink(isNameBased, db, collection)).toArray(function (err, documents) {
                        assert.equal(err, undefined, "error reading documents");
                        assert.equal(documents.constructor, Array, "Value should be an array");
                        // create a document
                        var beforeCreateDocumentsCount = documents.length;
                        var documentDefinition = { name: "sample document", foo: "bar", key: "value", replace: "new property" };
                        client.createDocument(getCollectionLink(isNameBased, db, collection), documentDefinition, { disableAutomaticIdGeneration: true }, function (err, document) {
                            assert(err !== undefined, "should throw an error because automatic id generation is disabled");
                            client.createDocument(getCollectionLink(isNameBased, db, collection), documentDefinition, function (err, document) {
                                assert.equal(err, undefined, "error creating document");
                                assert.equal(document.name, documentDefinition.name);
                                assert(document.id !== undefined);
                                // read documents after creation
                                client.readDocuments(getCollectionLink(isNameBased, db, collection)).toArray(function (err, documents) {
                                    assert.equal(err, undefined, "error reading documents");
                                    assert.equal(documents.length, beforeCreateDocumentsCount + 1, "create should increase the number of documents");
                                    // query documents
                                    var querySpec = {
                                        query: "SELECT * FROM root r WHERE r.id=@id",
                                        parameters: [
                                            {
                                                name: "@id",
                                                value: document.id
                                            }
                                        ]
                                    };
                                    client.queryDocuments(getCollectionLink(isNameBased, db, collection), querySpec).toArray(function (err, results) {
                                        assert.equal(err, undefined, "error querying documents");
                                        assert(results.length > 0, "number of results for the query should be > 0");
                                        client.queryDocuments(getCollectionLink(isNameBased, db, collection), querySpec, { enableScanInQuery: true }).toArray(function (err, results) {
                                            assert.equal(err, undefined, "error querying documents");
                                            assert(results.length > 0, "number of results for the query should be > 0");
                                            //replace document
                                            document.name = "replaced document";
                                            document.foo = "not bar";
                                            client.replaceDocument(getDocumentLink(isNameBased, db, collection, document), document, function (error, replacedDocument) {
                                                assert.equal(replacedDocument.name, "replaced document", "document name property should change");
                                                assert.equal(replacedDocument.foo, "not bar", "property should have changed");
                                                assert.equal(document.id, replacedDocument.id, "document id should stay the same");
                                                // read document
                                                client.readDocument(getDocumentLink(isNameBased, db, collection, replacedDocument), function (err, document) {
                                                    assert.equal(err, undefined, "readDocument should work successfully");
                                                    assert.equal(replacedDocument.id, document.id);
                                                    // delete document
                                                    client.deleteDocument(getDocumentLink(isNameBased, db, collection, replacedDocument), function (err, res) {
                                                        assert.equal(err, undefined, "error deleting document");
                                                        // read documents after deletion
                                                        client.readDocument(getDocumentLink(isNameBased, db, collection, document), function (err, document) {
                                                            var notFoundErrorCode = 404;
                                                            assert.equal(err.code, notFoundErrorCode, "response should return error code 404");
                                                            done();
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        };

        it("[nativeApi] Should do document CRUD operations successfully [name based]", function(done) {
            documentCRUDTest(true, done);
        });

        it("[nativeApi] Should do document CRUD operations successfully [rid based]", function (done) {
            documentCRUDTest(false, done);
        });
    });

    describe("Validate Attachment CRUD", function() {
        var createReadableStream = function(firstChunk, secondChunk) {
            var readableStream = new Stream.Readable();
            var chunkCount = 0;
            readableStream._read = function(n) {
                if(chunkCount === 0) {
                    this.push(firstChunk || "first chunk ");
                } else if(chunkCount === 1) {
                    this.push(secondChunk || "second chunk");
                } else {
                    this.push(null);
                }
                chunkCount++;
            };

            return readableStream;
        };

        var readMediaResponse = function(response, callback) {
            var data = "";
            response.on("data", function(chunk) {
                data += chunk;
            });
            response.on("end", function() {
                if (response.statusCode >= 300) {
                    return callback({code: response.statusCode, body: data});
                }

                return callback(undefined, data);
            });
        };

        var attachmentCRUDTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            // create database
            client.createDatabase({ id: "sample database" }, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                // create collection
                client.createCollection(getDatabaseLink(isNameBased, db), { id: "sample collection" }, function (err, collection) {
                    assert.equal(err, undefined, "error creating collection");
                    // create document
                    client.createDocument(getCollectionLink(isNameBased, db, collection), { id: "sample document", foo: "bar", key: "value" }, function (err, document) {
                        assert.equal(err, undefined, "error creating document");
                        // list all attachments
                        client.readAttachments(getDocumentLink(isNameBased, db, collection, document)).toArray(function (err, attachments) {
                            assert.equal(err, undefined, "error reading attachments");
                            assert.equal(attachments.constructor, Array, "Value should be an array");
                            var initialCount = attachments.length;
                            var validMediaOptions = { slug: "attachment name", contentType: "application/text" };
                            var invalidMediaOptions = { slug: "attachment name", contentType: "junt/test" };
                            // create attachment with invalid content-type
                            var contentStream = createReadableStream();
                            client.createAttachmentAndUploadMedia(getDocumentLink(isNameBased, db, collection, document), contentStream, invalidMediaOptions, function (err, attachment) {
                                assert(err !== undefined, "create attachment should return error on invalid mediatypes");
                                var badRequestErrorCode = 400;
                                assert.equal(err.code, badRequestErrorCode);
                                contentStream = createReadableStream();
                                // create streamed attachment with valid content-type
                                client.createAttachmentAndUploadMedia(getDocumentLink(isNameBased, db, collection, document), contentStream, validMediaOptions, function (err, validAttachment) {
                                    assert.equal(err, undefined, "error creating valid attachment");
                                    assert.equal(validAttachment.id, "attachment name", "name of created attachment should be the same as the one in the request");
                                    contentStream = createReadableStream();
                                    // create colliding attachment
                                    var content2 = "bug";
                                    client.createAttachmentAndUploadMedia(getDocumentLink(isNameBased, db, collection, document), contentStream, validMediaOptions, function (err, attachment) {
                                        assert(err !== undefined, "create conflicting attachment should return error on conflicting names");
                                        var conflictErrorCode = 409;
                                        assert.equal(err.code, conflictErrorCode);
                                        contentStream = createReadableStream();
                                        // create attachment with media link
                                        var dynamicAttachment = {
                                            id: "dynamic attachment",
                                            media: "http://xstore.",
                                            MediaType: "Book",
                                            Author: "My Book Author",
                                            Title: "My Book Title",
                                            contentType: "application/text"
                                        };
                                        client.createAttachment(getDocumentLink(isNameBased, db, collection, document), dynamicAttachment, function (err, attachment) {
                                            assert.equal(err, undefined, "error creating valid attachment");
                                            assert.equal(attachment.MediaType, "Book", "invalid media type");
                                            assert.equal(attachment.Author, "My Book Author", "invalid property value");
                                            // list all attachments
                                            client.readAttachments(getDocumentLink(isNameBased, db, collection, document)).toArray(function (err, attachments) {
                                                assert.equal(err, undefined, "error reading attachments");
                                                assert.equal(attachments.length, initialCount + 2, "number of attachments should've increased by 2");
                                                attachment.Author = "new author";
                                                //replace the attachment
                                                client.replaceAttachment(getAttachmentLink(isNameBased, db, collection, document, attachment), attachment, function (err, attachment) {
                                                    assert.equal(err, undefined, "error replacing attachment");
                                                    assert.equal(attachment.MediaType, "Book", "invalid media type");
                                                    assert.equal(attachment.Author, "new author", "invalid property value");
                                                    // read attachment media
                                                    client.readMedia(validAttachment.media, function (err, mediaResponse) {
                                                        assert.equal(err, undefined, "error reading attachment media");
                                                        assert.equal(mediaResponse, "first chunk second chunk");
                                                        contentStream = createReadableStream("modified first chunk ", "modified second chunk");
                                                        // update attachment media
                                                        client.updateMedia(validAttachment.media, contentStream, validMediaOptions, function (err, mediaResult) {
                                                            assert.equal(err, undefined, "error update media");
                                                            // read attachment media after update
                                                            // read media buffered
                                                            client.readMedia(validAttachment.media, function (err, mediaResponse) {
                                                                assert.equal(err, undefined, "error reading media");
                                                                assert.equal(mediaResponse, "modified first chunk modified second chunk");
                                                                // read media streamed
                                                                client.connectionPolicy.MediaReadMode = DocumentBase.MediaReadMode.Streamed;
                                                                client.readMedia(validAttachment.media, function (err, mediaResponse) {
                                                                    assert.equal(err, undefined, "error reading media");
                                                                    readMediaResponse(mediaResponse, function (err, mediaResult) {
                                                                        assert.equal(err, undefined, "error reading media");
                                                                        assert.equal(mediaResult, "modified first chunk modified second chunk");
                                                                        // share attachment with a second document
                                                                        client.createDocument(getCollectionLink(isNameBased, db, collection), { id: "document 2" }, function (err, document) {
                                                                            assert.equal(err, undefined, "error creating document");
                                                                            var secondAttachment = { id: validAttachment.id, contentType: validAttachment.contentType, media: validAttachment.media };
                                                                            client.createAttachment(getDocumentLink(isNameBased, db, collection, document), secondAttachment, function (err, attachment) {
                                                                                assert.equal(err, undefined, "error creating attachment");
                                                                                assert.equal(validAttachment.id, attachment.id, "name mismatch");
                                                                                assert.equal(validAttachment.media, attachment.media, "media mismatch");
                                                                                assert.equal(validAttachment.contentType, attachment.contentType, "contentType mismatch");
                                                                                // deleting attachment
                                                                                client.deleteAttachment(getAttachmentLink(isNameBased, db, collection, document, validAttachment), function (err, attachment) {
                                                                                    assert.equal(err, undefined, "error deleting attachments");
                                                                                    // read attachments after deletion
                                                                                    client.readAttachment(getAttachmentLink(isNameBased, db, collection, document, validAttachment), function (err, attachment) {
                                                                                        var notFoundErrorCode = 404;
                                                                                        assert.equal(err.code, notFoundErrorCode, "response should return error code 404");
                                                                                        done();
                                                                                    });
                                                                                });
                                                                            });
                                                                        });
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        };

        it("[nativeApi] Should do attachment CRUD operations successfully [name based]", function(done) {
            attachmentCRUDTest(true, done);
        });

        it("[nativeApi] Should do attachment CRUD operations successfully [rid based]", function (done) {
            attachmentCRUDTest(false, done);
        });
    });

    describe("Validate User CRUD", function () {
        var userCRUDTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            // create database
            client.createDatabase({ id: "sample database" }, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                // list users
                client.readUsers(getDatabaseLink(isNameBased, db)).toArray(function (err, users) {
                    assert.equal(err, undefined, "error reading users");
                    assert.equal(users.constructor, Array, "Value should be an array");
                    var beforeCreateCount = users.length;
                    // create user
                    client.createUser(getDatabaseLink(isNameBased, db), { id: "new user" }, function (err, user) {
                        assert.equal(err, undefined, "error creating User");
                        assert.equal(user.id, "new user", "user name error");
                        // list users after creation
                        client.readUsers(getDatabaseLink(isNameBased, db)).toArray(function (err, users) {
                            assert.equal(err, undefined, "error reading users");
                            assert.equal(users.length, beforeCreateCount + 1);
                            // query users
                            var querySpec = {
                                query: "SELECT * FROM root r WHERE r.id=@id",
                                parameters: [
                                    {
                                        name: "@id",
                                        value: "new user"
                                    }
                                ]
                            };
                            client.queryUsers(getDatabaseLink(isNameBased, db), querySpec).toArray(function (err, results) {
                                assert.equal(err, undefined, "error reading users");
                                assert(results.length > 0, "number of results for the query should be > 0");
                                //replace user
                                user.id = "replaced user";
                                client.replaceUser(user._self, user, function (error, replacedUser) {
                                    assert.equal(replacedUser.id, "replaced user", "user name should change");
                                    assert.equal(user.id, replacedUser.id, "user id should stay the same");
                                    // read user
                                    client.readUser(getUserLink(isNameBased, db, replacedUser), function (err, user) {
                                        assert.equal(err, undefined, "readUser should work successfully");
                                        assert.equal(replacedUser.id, user.id);
                                        // delete user
                                        client.deleteUser(getUserLink(isNameBased, db, user), function (err, res) {
                                            assert.equal(err, undefined, "delete user should should work successfully");
                                            // read user after deletion
                                            client.readUser(getUserLink(isNameBased, db, user), function (err, user) {
                                                var notFoundErrorCode = 404;
                                                assert.equal(err.code, notFoundErrorCode, "response should return error code 404");
                                                done();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        };

        it("[nativeApi] Should do User CRUD operations successfully [name based]", function(done) {
            userCRUDTest(true, done);
        });

        it("[nativeApi] Should do User CRUD operations successfully [rid based]", function (done) {
            userCRUDTest(false, done);
        });
    });

    describe("Validate Permission CRUD", function () {
        var permissionCRUDTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            // create database
            client.createDatabase({ id: "sample database" }, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                client.createCollection(getDatabaseLink(isNameBased, db), { id: "sample coll" }, function (err, coll) {
                    assert.equal(err, undefined, "error creating collection");
                    // create user
                    client.createUser(getDatabaseLink(isNameBased, db), { id: "new user" }, function (err, user) {
                        assert.equal(err, undefined, "error creating user");
                        assert.equal(err, undefined, "error creating user");
                        // list permissions
                        client.readPermissions(getUserLink(isNameBased, db, user)).toArray(function (err, permissions) {
                            assert.equal(err, undefined, "error reading permissions");
                            assert.equal(permissions.constructor, Array, "Value should be an array");
                            var beforeCreateCount = permissions.length;
                            var permission = { id: "new permission", permissionMode: DocumentBase.PermissionMode.Read, resource: coll._self };
                            // create permission
                            client.createPermission(getUserLink(isNameBased, db, user), permission, function (err, permission) {
                                assert.equal(err, undefined, "error creating permission");
                                assert.equal(permission.id, "new permission", "permission name error");
                                // list permissions after creation
                                client.readPermissions(getUserLink(isNameBased, db, user)).toArray(function (err, permissions) {
                                    assert.equal(err, undefined, "error reading permissions");
                                    assert.equal(permissions.length, beforeCreateCount + 1);
                                    // query permissions
                                    var querySpec = {
                                        query: "SELECT * FROM root r WHERE r.id=@id",
                                        parameters: [
                                            {
                                                name: "@id",
                                                value: permission.id
                                            }
                                        ]
                                    };
                                    client.queryPermissions(getUserLink(isNameBased, db, user), querySpec).toArray(function (err, results) {
                                        assert.equal(err, undefined, "error querying permissions");
                                        assert(results.length > 0, "number of results for the query should be > 0");
                                        //replace permission
                                        permission.id = "replaced permission";
                                        client.replacePermission(permission._self, permission, function (error, replacedPermission) {
                                            assert.equal(error, undefined, "error replacing permission");
                                            assert.equal(replacedPermission.id, "replaced permission", "permission name should change");
                                            assert.equal(permission.id, replacedPermission.id, "permission id should stay the same");
                                            // read permission
                                            client.readPermission(getPermissionLink(isNameBased, db, user, replacedPermission), replacedPermission.id, function (err, permission) {
                                                assert.equal(err, undefined, "readUser should work successfully");
                                                assert.equal(replacedPermission.id, permission.id);
                                                // delete permission
                                                client.deletePermission(getPermissionLink(isNameBased, db, user, replacedPermission), function (err, res) {
                                                    assert.equal(err, undefined, "delete permission should should work successfully");
                                                    // read permission after deletion
                                                    client.readPermission(getPermissionLink(isNameBased, db, user, permission), function (err, permission) {
                                                        var notFoundErrorCode = 404;
                                                        assert.equal(err.code, notFoundErrorCode, "response should return error code 404");
                                                        done();
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        };

        it("[nativeApi] Should do Permission CRUD operations successfully [name based]", function(done) {
            permissionCRUDTest(true, done);
        });

        it("[nativeApi] Should do Permission CRUD operations successfully [rid based]", function (done) {
            permissionCRUDTest(false, done);
        });
    });

    describe("Validate Authorization", function() {
        var setupEntities = function(isNameBased, client, callback) {
            // create database
            client.createDatabase({ id: "sample database" }, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                // create collection1
                client.createCollection(getDatabaseLink(isNameBased, db), { id: "sample collection" }, function (err, collection1) {
                    assert.equal(err, undefined, "error creating collection");
                    // create document1
                    client.createDocument(getCollectionLink(isNameBased, db, collection1), { id: "coll1doc1", foo: "bar", key: "value" }, function (err, document1) {
                        assert.equal(err, undefined, "error creating document");
                        // create document 2
                        client.createDocument(getCollectionLink(isNameBased, db, collection1), { id: "coll1doc2", foo: "bar2", key: "value2" }, function (err, document2) {
                            assert.equal(err, undefined, "error creating document");
                            // create attachment
                            var dynamicAttachment = {
                                id: "dynamic attachment",
                                media: "http://xstore.",
                                MediaType: "Book",
                                Author: "My Book Author",
                                Title: "My Book Title",
                                contentType: "application/text"
                            };
                            client.createAttachment(getDocumentLink(isNameBased, db, collection1, document1), dynamicAttachment, function (err, attachment) {
                                assert.equal(err, undefined, "error creating attachment");
                                // create collection 2
                                client.createCollection(getDatabaseLink(isNameBased, db), { id: "sample collection2" }, function (err, collection2) {
                                    assert.equal(err, undefined, "error creating collection");
                                    // create user1
                                    client.createUser(getDatabaseLink(isNameBased, db), { id: "user1" }, function (err, user1) {
                                        assert.equal(err, undefined, "error creating user");
                                        var permission = { id: "permission On Coll1", permissionMode: DocumentBase.PermissionMode.Read, resource: collection1._self};
                                        // create permission for collection1
                                        client.createPermission(getUserLink(isNameBased, db, user1), permission, function (err, permissionOnColl1) {
                                            assert.equal(err, undefined, "error creating permission");
                                            assert(permissionOnColl1._token !== undefined, "permission token is invalid");
                                            permission = { id: "permission On Doc1", permissionMode: DocumentBase.PermissionMode.All, resource: document2._self};
                                            // create permission for document 2
                                            client.createPermission(getUserLink(isNameBased, db, user1), permission, function (err, permissionOnDoc2) {
                                                assert.equal(err, undefined, "error creating permission");
                                                assert(permissionOnDoc2._token !== undefined, "permission token is invalid");
                                                // create user 2
                                                client.createUser(getDatabaseLink(isNameBased, db), { id: "user2" }, function (err, user2) {
                                                    assert.equal(err, undefined, "error creating user");
                                                    permission = { id: "permission On coll2", permissionMode: DocumentBase.PermissionMode.All, resource: collection2._self};
                                                    // create permission on collection 2
                                                    client.createPermission(getUserLink(isNameBased, db, user2), permission, function (err, permissionOnColl2) {
                                                        assert.equal(err, undefined, "error creating permission");
                                                        var entities = {
                                                            db: db,
                                                            coll1: collection1,
                                                            coll2: collection2,
                                                            doc1: document1,
                                                            doc2: document2,
                                                            user1: user1,
                                                            user2: user2,
                                                            attachment: attachment,
                                                            permissionOnColl1: permissionOnColl1,
                                                            permissionOnDoc2: permissionOnDoc2,
                                                            permissionOnColl2: permissionOnColl2
                                                        };

                                                        callback(entities);
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        };

        var authorizationCRUDTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host);
            client.readDatabases().toArray(function (err, databases) {
                assert(err !== undefined, "error should not be undefined");
                var unauthorizedErrorCode = 401;
                assert.equal(err.code, unauthorizedErrorCode, "error code should be equal to 401");
                client = new DocumentDBClient(host, { masterKey: masterKey });
                // setup entities
                setupEntities(isNameBased, client, function (entities) {
                    var resourceTokens = {};
                    resourceTokens[entities.coll1._rid] = entities.permissionOnColl1._token;
                    resourceTokens[entities.doc1._rid] = entities.permissionOnColl1._token;
                    var col1Client = new DocumentDBClient(host, { resourceTokens: resourceTokens });
                    // 1. Success-- Use Col1 Permission to Read
                    col1Client.readCollection(entities.coll1._self, function (err, successColl1) {
                        assert.equal(err, undefined, "error reading collections");
                        assert(successColl1 !== undefined, "error reading collection");
                        // 2. Failure-- Use Col1 Permission to delete
                        col1Client.deleteCollection(getCollectionLink(isNameBased, entities.db, successColl1), function (err, result) {
                            assert(err !== undefined, "expected to fail, no permission to delete");
                            // 3. Success-- Use Col1 Permission to Read All Docs
                            col1Client.readDocuments(successColl1._self).toArray(function (err, successDocuments) {
                                assert.equal(err, undefined, "error reading documents");
                                assert(successDocuments !== undefined, "error reading documents");
                                assert.equal(successDocuments.length, 2, "Expected 2 Documents to be succesfully read");
                                // 4. Success-- Use Col1 Permission to Read Col1Doc1
                                col1Client.readDocument(entities.doc1._self, function (err, successDoc) {
                                    assert.equal(err, undefined, "error reading document");
                                    assert(successDoc !== undefined, "error reading document");
                                    assert.equal(successDoc.id, entities.doc1.id, "Expected to read children using parent permissions");
                                    var col2Client = new DocumentDBClient(host, { permissionFeed: [entities.permissionOnColl2] });
                                    var doc = { id: "new doc", CustomProperty1: "BBBBBB", customProperty2: 1000 };
                                    col2Client.createDocument(getCollectionLink(isNameBased, entities.db, entities.coll2), doc, function (err, successDoc) {
                                        assert.equal(err, undefined, "error creating document");
                                        assert(successDoc !== undefined, "error creating document");
                                        assert.equal(successDoc.CustomProperty1, doc.CustomProperty1, "document should have been created successfully");
                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        };

        it("[nativeApi] Should do authorization successfully [name based]", function(done) {
            authorizationCRUDTest(true, done);
        });

        it("[nativeApi] Should do authorization successfully [rid based]", function (done) {
            authorizationCRUDTest(false, done);
        });
    });

    describe("Validate Trigger CRUD", function () {
        var triggerCRUDTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            // create database
            client.createDatabase({ id: "sample database" }, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                // create collection
                client.createCollection(getDatabaseLink(isNameBased, db), { id: "sample collection" }, function (err, collection) {
                    assert.equal(err, undefined, "error creating collection");
                    // read triggers
                    client.readTriggers(getCollectionLink(isNameBased, db, collection)).toArray(function (err, triggers) {
                        assert.equal(err, undefined, "error reading triggers");
                        assert.equal(triggers.constructor, Array, "Value should be an array");
                        // create a trigger
                        var beforeCreateTriggersCount = triggers.length;
                        var triggerDefinition = {
                            id: "sample trigger",
                            serverScript: function () { var x = 10; },
                            triggerType: DocumentBase.TriggerType.Pre,
                            triggerOperation: DocumentBase.TriggerOperation.All
                        };
                        client.createTrigger(getCollectionLink(isNameBased, db, collection), triggerDefinition, function (err, trigger) {
                            assert.equal(err, undefined, "error creating trigger");
                            for (var property in triggerDefinition) {
                                if (property !== "serverScript") {
                                    assert.equal(trigger[property], triggerDefinition[property], "property " + property + " should match");
                                } else {
                                    assert.equal(trigger.body, "function () { var x = 10; }");
                                }
                            }
                            // read triggers after creation
                            client.readTriggers(getCollectionLink(isNameBased, db, collection)).toArray(function (err, triggers) {
                                assert.equal(err, undefined, "error reading triggers");
                                assert.equal(triggers.length, beforeCreateTriggersCount + 1, "create should increase the number of triggers");
                                // query triggers
                                var querySpec = {
                                    query: "SELECT * FROM root r WHERE r.id=@id",
                                    parameters: [
                                        {
                                            name: "@id",
                                            value: triggerDefinition.id
                                        }
                                    ]
                                };
                                client.queryTriggers(getCollectionLink(isNameBased, db, collection), querySpec).toArray(function (err, results) {
                                    assert.equal(err, undefined, "error querying triggers");
                                    assert(results.length > 0, "number of results for the query should be > 0");
                                    //replace trigger
                                    trigger.body = function () { var x = 20; };
                                    client.replaceTrigger(getTriggerLink(isNameBased, db, collection, trigger), trigger, function (error, replacedTrigger) {
                                        assert.equal(err, undefined, "error replacing trigger");
                                        for (var property in triggerDefinition) {
                                            if (property !== "serverScript") {
                                                assert.equal(replacedTrigger[property], trigger[property], "property " + property + " should match");
                                            } else {
                                                assert.equal(replacedTrigger.body, "function () { var x = 20; }");
                                            }
                                        }
                                        // read trigger
                                        client.readTrigger(getTriggerLink(isNameBased, db, collection, replacedTrigger), function (err, trigger) {
                                            assert.equal(err, undefined, "readTrigger should work successfully");
                                            assert.equal(replacedTrigger.id, trigger.id);
                                            // delete trigger
                                            client.deleteTrigger(getTriggerLink(isNameBased, db, collection, replacedTrigger), function (err, res) {
                                                assert.equal(err, undefined, "error deleting trigger");
                                                // read triggers after deletion
                                                client.readTrigger(getTriggerLink(isNameBased, db, collection, replacedTrigger), function (err, trigger) {
                                                    var notFoundErrorCode = 404;
                                                    assert.equal(err.code, notFoundErrorCode, "response should return error code 404");
                                                    done();
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        };

        it("[nativeApi] Should do trigger CRUD operations successfully [name based]", function(done) {
            triggerCRUDTest(true, done);
        });

        it("[nativeApi] Should do trigger CRUD operations successfully [rid based]", function (done) {
            triggerCRUDTest(false, done);
        });
    });

    describe("Validate UDF CRUD", function () {
        var udfCRUDTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            // create database
            client.createDatabase({ id: "sample database" }, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                // create collection
                client.createCollection(getDatabaseLink(isNameBased, db), { id: "sample collection" }, function (err, collection) {
                    assert.equal(err, undefined, "error creating collection");
                    // read udfs
                    client.readUserDefinedFunctions(getCollectionLink(isNameBased, db, collection)).toArray(function (err, udfs) {
                        assert.equal(err, undefined, "error reading udfs");
                        assert.equal(udfs.constructor, Array, "Value should be an array");
                        // create a udf
                        var beforeCreateUdfsCount = udfs.length;
                        var udfDefinition = {
                            id: "sample udf",
                            serverScript: function () { var x = 10; }
                        };
                        client.createUserDefinedFunction(getCollectionLink(isNameBased, db, collection), udfDefinition, function (err, udf) {
                            assert.equal(err, undefined, "error creating udf");
                            for (var property in udfDefinition) {
                                if (property !== "serverScript") {
                                    assert.equal(udf[property], udfDefinition[property], "property " + property + " should match");
                                } else {
                                    assert.equal(udf.body, "function () { var x = 10; }");
                                }
                            }

                            // read udfs after creation
                            client.readUserDefinedFunctions(getCollectionLink(isNameBased, db, collection)).toArray(function (err, udfs) {
                                assert.equal(err, undefined, "error reading user defined functions");
                                assert.equal(udfs.length, beforeCreateUdfsCount + 1, "create should increase the number of udfs");
                                // query udfs
                                var querySpec = {
                                    query: "SELECT * FROM root r WHERE r.id=@id",
                                    parameters: [
                                        {
                                            name: "@id",
                                            value: udfDefinition.id
                                        }
                                    ]
                                };
                                client.queryUserDefinedFunctions(getCollectionLink(isNameBased, db, collection), querySpec).toArray(function (err, results) {
                                    assert.equal(err, undefined, "error creating user defined functions");
                                    assert(results.length > 0, "number of results for the query should be > 0");
                                    // replace udf
                                    udf.body = function () { var x = 20; };
                                    client.replaceUserDefinedFunction(getUserDefinedFunctionLink(isNameBased, db, collection, udf), udf, function (error, replacedUdf) {
                                        assert.equal(err, undefined, "error replacing user defined function");
                                        for (var property in udfDefinition) {
                                            if (property !== "serverScript") {
                                                assert.equal(replacedUdf[property], udf[property], "property " + property + " should match");
                                            } else {
                                                assert.equal(replacedUdf.body, "function () { var x = 20; }");
                                            }
                                        }
                                        // read udf
                                        client.readUserDefinedFunction(getUserDefinedFunctionLink(isNameBased, db, collection, replacedUdf), function (err, udf) {
                                            assert.equal(err, undefined, "readUserDefinedFunctions should work successfully");
                                            assert.equal(replacedUdf.id, udf.id);
                                            // delete udf
                                            client.deleteUserDefinedFunction(getUserDefinedFunctionLink(isNameBased, db, collection, replacedUdf), function (err, res) {
                                                assert.equal(err, undefined, "error deleting user defined function");
                                                // read udfs after deletion
                                                client.readUserDefinedFunction(getUserDefinedFunctionLink(isNameBased, db, collection, replacedUdf), function (err, udf) {
                                                    var notFoundErrorCode = 404;
                                                    assert.equal(err.code, notFoundErrorCode, "response should return error code 404");
                                                    done();
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        };

        it("[nativeApi] Should do UDF CRUD operations successfully [name based]", function(done) {
            udfCRUDTest(true, done);
        });

        it("[nativeApi] Should do UDF CRUD operations successfully [rid based]", function (done) {
            udfCRUDTest(false, done);
        });
    });

    describe("Validate sproc CRUD", function () {
        var sprocCRUDTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            // create database
            client.createDatabase({ id: "sample database" }, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                // create collection
                client.createCollection(getDatabaseLink(isNameBased, db), { id: "sample collection" }, function (err, collection) {
                    assert.equal(err, undefined, "error creating collection");
                    // read sprocs
                    client.readStoredProcedures(getCollectionLink(isNameBased, db, collection)).toArray(function (err, sprocs) {
                        assert.equal(err, undefined, "error reading sprocs");
                        assert.equal(sprocs.constructor, Array, "Value should be an array");
                        // create a sproc
                        var beforeCreateSprocsCount = sprocs.length;
                        var sprocDefinition = {
                            id: "sample sproc",
                            serverScript: function () { var x = 10; }
                        };
                        client.createStoredProcedure(getCollectionLink(isNameBased, db, collection), sprocDefinition, function (err, sproc) {
                            assert.equal(err, undefined, "error creating sproc");
                            for (var property in sprocDefinition) {
                                if (property !== "serverScript") {
                                    assert.equal(sproc[property], sprocDefinition[property], "property " + property + " should match");
                                } else {
                                    assert.equal(sproc.body, "function () { var x = 10; }");
                                }
                            }

                            // read sprocs after creation
                            client.readStoredProcedures(getCollectionLink(isNameBased, db, collection)).toArray(function (err, sprocs) {
                                assert.equal(err, undefined, "error reading stored procedures");
                                assert.equal(sprocs.length, beforeCreateSprocsCount + 1, "create should increase the number of sprocs");
                                // query sprocs
                                var querySpec = {
                                    query: "SELECT * FROM root r"
                                };
                                client.queryStoredProcedures(getCollectionLink(isNameBased, db, collection), querySpec).toArray(function (err, sprocs) {
                                    assert.equal(err, undefined, "error querying stored procedures");
                                    assert(sprocs.length > 0, "number of sprocs for the query should be > 0");
                                    // replace sproc
                                    sproc.body = function () { var x = 20; };
                                    client.replaceStoredProcedure(getStoredProcedureLink(isNameBased, db, collection, sproc), sproc, function (error, replacedSproc) {
                                        assert.equal(error, undefined, "error replacing store procedure");
                                        for (var property in sprocDefinition) {
                                            if (property !== "serverScript") {
                                                assert.equal(replacedSproc[property], sproc[property], "property " + property + " should match");
                                            } else {
                                                assert.equal(replacedSproc.body, "function () { var x = 20; }");
                                            }
                                        }
                                        // read sproc
                                        client.readStoredProcedure(getStoredProcedureLink(isNameBased, db, collection, replacedSproc), function (err, sproc) {
                                            assert.equal(err, undefined, "readStoredProcedures should work successfully");
                                            assert.equal(replacedSproc.id, sproc.id);
                                            // delete sproc
                                            client.deleteStoredProcedure(getStoredProcedureLink(isNameBased, db, collection, replacedSproc), function (err, res) {
                                                assert.equal(err, undefined, "error deleting stored procedure");
                                                // read sprocs after deletion
                                                client.readStoredProcedure(getStoredProcedureLink(isNameBased, db, collection, replacedSproc), function (err, sproc) {
                                                    var notFoundErrorCode = 404;
                                                    assert.equal(err.code, notFoundErrorCode, "response should return error code 404");
                                                    done();
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        };

        it("[nativeApi] Should do sproc CRUD operations successfully [name based]", function(done) {
            sprocCRUDTest(true, done);
        });

        it("[nativeApi] Should do sproc CRUD operations successfully [rid based]", function (done) {
            sprocCRUDTest(false, done);
        });
    });

    describe("Validate spatial index", function () {
        var spatialIndexTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            // create database
            client.createDatabase({ id: "sample database" }, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                // create collection using an indexing policy with spatial index.
                var indexingPolicy = {
                    includedPaths: [
                        {
                            path: "/\"Location\"/?",
                            indexes: [
                                {
                                    kind: "Spatial",
                                    dataType: "Point"
                                }
                            ]
                        },
                        {
                            path: "/"
                        }
                    ]
                };
                client.createCollection(getDatabaseLink(isNameBased, db), { id: "sample collection", indexingPolicy: indexingPolicy }, function (err, collection) {
                    assert.equal(err, undefined, "error creating collection");
                    var location1 = {
                        id: "location1",
                        Location: {
                            type: "Point",
                            coordinates: [20.0, 20.0]
                        }
                    };
                    client.createDocument(getCollectionLink(isNameBased, db, collection), location1, function (err, _) {
                        assert.equal(err, undefined, "error creating location1");
                        var location2 = {
                            id: "location2",
                            Location: {
                                type: "Point",
                                coordinates: [100.0, 100.0]
                            }
                        };
                        client.createDocument(getCollectionLink(isNameBased, db, collection), location2, function (err, _) {
                            assert.equal(err, undefined, "error creating location2");
                            var query = "SELECT * FROM root WHERE (ST_DISTANCE(root.Location, {type: 'Point', coordinates: [20.1, 20]}) < 20000) ";
                            client.queryDocuments(getCollectionLink(isNameBased, db, collection), query).toArray(function (err, results) {
                                assert.equal(err, undefined, "error querying locations");
                                assert.equal(1, results.length);
                                assert.equal("location1", results[0].id);
                                done();
                            });
                        });
                    });
                });
            });
        };

        it("[nativeApi] Should support spatial index [name based]", function (done) {
            spatialIndexTest(true, done);
        });

        it("[nativeApi] Should support spatial index [rid based]", function (done) {
            spatialIndexTest(false, done);
        });
    });

    describe("Validate collection indexing policy", function () {
        var indexPolicyTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            // create database
            client.createDatabase({ id: "sample database" }, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                // create collection
                client.createCollection(getDatabaseLink(isNameBased, db), { id: "sample collection" }, function (err, collection) {
                    assert.equal(err, undefined, "error creating collection");
                    assert.equal(collection.indexingPolicy.indexingMode, DocumentBase.IndexingMode.Consistent, "default indexing mode should be consistent");
                    var lazyCollectionDefinition = { id: "lazy collection", indexingPolicy: { indexingMode: DocumentBase.IndexingMode.Lazy } };
                    client.deleteCollection(getCollectionLink(isNameBased, db, collection), function (err, coll) {
                        assert.equal(err, undefined, "error deleting collection");
                        client.createCollection(getDatabaseLink(isNameBased, db), lazyCollectionDefinition, function (err, lazyCollection) {
                            assert.equal(err, undefined, "error creating collection");
                            assert.equal(lazyCollection.indexingPolicy.indexingMode, DocumentBase.IndexingMode.Lazy, "indexing mode should be lazy");
                            var consistentCollectionDefinition = { id: "lazy collection", indexingPolicy: { indexingMode: DocumentBase.IndexingMode.Consistent } };
                            client.deleteCollection(getCollectionLink(isNameBased, db, lazyCollection), function (err, coll) {
                                assert.equal(err, undefined, "error deleting collection");
                                client.createCollection(getDatabaseLink(isNameBased, db), consistentCollectionDefinition, function (err, consistentCollection) {
                                    assert.equal(err, undefined, "error creating collection");
                                    assert.equal(collection.indexingPolicy.indexingMode, DocumentBase.IndexingMode.Consistent, "indexing mode should be consistent");
                                    var collectionDefinition = {
                                        "id": "CollectionWithIndexingPolicy",
                                        "indexingPolicy": {
                                            automatic: true,
                                            indexingMode: DocumentBase.IndexingMode.Consistent,
                                            "includedPaths": [
                                                {
                                                    "path": "/",
                                                    "indexes": [
                                                        {
                                                            "kind": DocumentBase.IndexKind.Hash,
                                                            "dataType": DocumentBase.DataType.Number,
                                                            "precision": 2
                                                        }
                                                    ]
                                                }
                                            ],
                                            "excludedPaths": [
                                                {
                                                    "path": "/\"systemMetadata\"/*"
                                                }
                                            ]
                                        }

                                    };

                                    client.deleteCollection(getCollectionLink(isNameBased, db, consistentCollection), function (err, coll) {
                                        assert.equal(err, undefined, "error deleting collection");
                                        client.createCollection(getDatabaseLink(isNameBased, db), collectionDefinition, function (err, collectionWithIndexingPolicy) {
                                            assert.equal(err, undefined, "error creating collection");

                                            // Two included paths.
                                            assert.equal(2, collectionWithIndexingPolicy.indexingPolicy.includedPaths.length, "Unexpected includedPaths length");
                                            // The first included path is what we created.
                                            assert.equal("/", collectionWithIndexingPolicy.indexingPolicy.includedPaths[0].path);
                                            assert(collectionWithIndexingPolicy.indexingPolicy.includedPaths[0].indexes.length > 1);  // Backend adds a default index
                                            assert.equal(DocumentBase.IndexKind.Hash, collectionWithIndexingPolicy.indexingPolicy.includedPaths[0].indexes[0].kind);
                                            // The second included path is a timestamp index created by the server.

                                            // And one excluded path.
                                            assert.equal(1, collectionWithIndexingPolicy.indexingPolicy.excludedPaths.length, "Unexpected excludedPaths length");
                                            assert.equal("/\"systemMetadata\"/*", collectionWithIndexingPolicy.indexingPolicy.excludedPaths[0].path);

                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        };

        it("[nativeApi] Should create collection with correct indexing policy [name based]", function(done) {
            indexPolicyTest(true, done);
        });

        it("[nativeApi] Should create collection with correct indexing policy [rid based]", function (done) {
            indexPolicyTest(false, done);
        });

        var checkDefaultIndexingPolicyPaths = function (indexingPolicy) {
            // no excluded paths.
            assert.equal(0, indexingPolicy["excludedPaths"].length);
            // included paths should be 2 "_ts" and "/".
            assert.equal(2, indexingPolicy["includedPaths"].length);

            // check default paths.
            assert.equal("/*", indexingPolicy["includedPaths"][0]["path"]);
            assert.equal(2, indexingPolicy["includedPaths"][0]["indexes"].length);
            assert.equal("Hash", indexingPolicy["includedPaths"][0]["indexes"][0]["kind"]);
            assert.equal("String", indexingPolicy["includedPaths"][0]["indexes"][0]["dataType"]);
            assert.equal(3, indexingPolicy["includedPaths"][0]["indexes"][0]["precision"]);
            assert.equal("Range", indexingPolicy["includedPaths"][0]["indexes"][1]["kind"]);
            assert.equal("Number", indexingPolicy["includedPaths"][0]["indexes"][1]["dataType"]);
            assert.equal(-1, indexingPolicy["includedPaths"][0]["indexes"][1]["precision"]);

            // _ts.
            assert.equal("/\"_ts\"/?", indexingPolicy["includedPaths"][1]["path"]);
        };

        var defaultIndexingPolicyTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            // create database
            client.createDatabase({ id: "sample database" }, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                // create collection with no indexing policy specified.
                var collectionDefinition01 = { id: "TestCreateDefaultPolicy01" };
                client.createCollection(getDatabaseLink(isNameBased, db), collectionDefinition01, function (err, collection) {
                    assert.equal(err, undefined, "error creating collection");
                    checkDefaultIndexingPolicyPaths(collection["indexingPolicy"]);
                    // create collection with partial policy specified.
                    var collectionDefinition02 = {
                        id: "TestCreateDefaultPolicy02",
                        indexingPolicy: {
                            indexingMode: "Lazy",
                            automatic: true
                        }
                    };
                    client.createCollection(getDatabaseLink(isNameBased, db), collectionDefinition02, function (err, collection) {
                        assert.equal(err, undefined, "error creating collection");
                        checkDefaultIndexingPolicyPaths(collection["indexingPolicy"]);
                        // create collection with default policy.
                        var collectionDefinition03 = {
                            id: "TestCreateDefaultPolicy03",
                            indexingPolicy: {}
                        };
                        client.createCollection(getDatabaseLink(isNameBased, db), collectionDefinition03, function (err, collection) {
                            assert.equal(err, undefined, "error creating collection");
                            checkDefaultIndexingPolicyPaths(collection["indexingPolicy"]);
                            // create collection with indexing policy missing indexes.
                            var collectionDefinition04 = {
                                id: "TestCreateDefaultPolicy04",
                                indexingPolicy: {
                                    includedPaths: [
                                        {
                                            path: "/*"
                                        }
                                    ]
                                }
                            };
                            client.createCollection(getDatabaseLink(isNameBased, db), collectionDefinition04, function (err, collection) {
                                assert.equal(err, undefined, "error creating collection");
                                checkDefaultIndexingPolicyPaths(collection["indexingPolicy"]);
                                // create collection with indexing policy missing precision.
                                var collectionDefinition05 = {
                                    id: "TestCreateDefaultPolicy05",
                                    indexingPolicy: {
                                        includedPaths: [
                                            {
                                                path: "/*",
                                                indexes: [
                                                    {
                                                        kind: "Hash",
                                                        dataType: "String"
                                                    },
                                                    {
                                                        kind: "Range",
                                                        dataType: "Number"
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                };
                                client.createCollection(getDatabaseLink(isNameBased, db), collectionDefinition05, function (err, collection) {
                                    assert.equal(err, undefined, "error creating collection");
                                    checkDefaultIndexingPolicyPaths(collection["indexingPolicy"]);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        };

        it("[nativeApi] Should create collection with default indexing policy [name based]", function (done) {
            defaultIndexingPolicyTest(true, done);
        });

        it("[nativeApi] Should create collection with default indexing policy [rid based]", function (done) {
            defaultIndexingPolicyTest(false, done);
        });
    });

    describe("Validate client request timeout", function () {
        var timeoutTest = function (isNameBased, done) {
            var connectionPolicy = new DocumentBase.ConnectionPolicy();
            // making timeout 1 ms to make sure it will throw
            connectionPolicy.RequestTimeout = 1;
            var client = new DocumentDBClient(host, { masterKey: masterKey }, connectionPolicy);
            // create database
            client.createDatabase({ id: "sample database" }, function (err, db) {
                assert.equal(err.code, "ECONNRESET", "client should throw exception");
                done();
            });
        };

        it("[nativeApi] Client Should throw exception [name based]", function(done) {
            timeoutTest(true, done);
        });

        it("[nativeApi] Client Should throw exception [rid based]", function (done) {
            timeoutTest(false, done);
        });
    });

    describe("Validate QueryIterator Functionality", function() {
        var createResources = function(isNameBased, client, callback) {
            client.createDatabase({ id: "sample database" + Math.random() }, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                client.createCollection(getDatabaseLink(isNameBased, db), { id: "sample collection" }, function (err, collection) {
                    assert.equal(err, undefined, "error creating collection");
                    client.createDocument(getCollectionLink(isNameBased, db, collection), { id: "doc1", prop1: "value1" }, function (err, doc1) {
                        assert.equal(err, undefined, "error creating document");
                        client.createDocument(getCollectionLink(isNameBased, db, collection), { id: "doc2", prop1: "value2" }, function (err, doc2) {
                            assert.equal(err, undefined, "error creating document");
                            client.createDocument(getCollectionLink(isNameBased, db, collection), { id: "doc3", prop1: "value3" }, function (err, doc3) {
                                assert.equal(err, undefined, "error creating document");
                                var resources = {
                                    db: db,
                                    coll: collection,
                                    doc1: doc1,
                                    doc2: doc2,
                                    doc3: doc3
                                };

                                callback(resources);
                            });
                        });
                    });
                });
            });
        };

        var queryIteratorToArrayTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            createResources(isNameBased, client, function (resources) {
                var queryIterator = client.readDocuments(getCollectionLink(isNameBased, resources.db, resources.coll), { maxItemCount: 2 });
                queryIterator.toArray(function (err, docs) {
                    assert.equal(err, undefined, "error reading documents");
                    assert.equal(docs.length, 3, "queryIterator should return all documents using continuation");
                    assert.equal(docs[0].id, resources.doc1.id);
                    assert.equal(docs[1].id, resources.doc2.id);
                    assert.equal(docs[2].id, resources.doc3.id);
                    done();
                });
            });
        };

        it("[nativeApi] validate QueryIterator iterator toArray [name based]", function(done) {
            queryIteratorToArrayTest(true, done);
        });

        it("[nativeApi] validate QueryIterator iterator toArray [rid based]", function (done) {
            queryIteratorToArrayTest(false, done);
        });

        var queryIteratorForEachTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            createResources(isNameBased, client, function (resources) {
                var queryIterator = client.readDocuments(getCollectionLink(isNameBased, resources.db, resources.coll), { maxItemCount: 2 });
                var counter = 0;
                // test queryIterator.forEach
                queryIterator.forEach(function (err, doc) {
                    assert.equal(err, undefined, "error reading documents");
                    counter++;
                    if (counter === 1) {
                        assert.equal(doc.id, resources.doc1.id, "first document should be doc1");
                    } else if (counter === 2) {
                        assert.equal(doc.id, resources.doc2.id, "second document should be doc2");
                    } else if (counter === 3) {
                        assert.equal(doc.id, resources.doc3.id, "third document should be doc3");
                    }

                    if (doc === undefined) {
                        assert(counter < 5, "iterator should have stopped");
                        done();
                    }
                });
            });
        };

        it("[nativeApi] validate queryIterator iterator forEach [name based]", function(done) {
            queryIteratorForEachTest(true, done);
        });

        it("[nativeApi] validate queryIterator iterator forEach [rid based]", function (done) {
            queryIteratorForEachTest(false, done);
        });

        var queryIteratorNextAndMoreTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            createResources(isNameBased, client, function (resources) {
                var queryIterator = client.readDocuments(getCollectionLink(isNameBased, resources.db, resources.coll), { maxItemCount: 2 });
                assert.equal(queryIterator.hasMoreResults(), true);
                queryIterator.current(function (err, doc) {
                    assert.equal(err, undefined, "error querying documents");
                    assert.equal(doc.id, resources.doc1.id, "call queryIterator.current after reset should return first document");
                    queryIterator.nextItem(function (err, doc) {
                        assert.equal(err, undefined, "error querying documents");
                        assert.equal(doc.id, resources.doc1.id, "call queryIterator.nextItem after reset should return first document");
                        assert.equal(queryIterator.hasMoreResults(), true);
                        queryIterator.current(function (err, doc) {
                            assert.equal(err, undefined, "error querying documents");
                            assert.equal(doc.id, resources.doc2.id, "call queryIterator.current should return second document");
                            queryIterator.nextItem(function (err, doc) {
                                assert.equal(err, undefined, "error querying documents");
                                assert.equal(doc.id, resources.doc2.id, "call queryIterator.nextItem again should return second document");
                                assert.equal(queryIterator.hasMoreResults(), true);
                                queryIterator.current(function (err, doc) {
                                    assert.equal(err, undefined, "error querying documents");
                                    assert.equal(doc.id, resources.doc3.id, "call queryIterator.current should return third document");
                                    queryIterator.nextItem(function (err, doc) {
                                        assert.equal(err, undefined, "error querying documents");
                                        assert.equal(doc.id, resources.doc3.id, "call queryIterator.nextItem again should return third document");
                                        queryIterator.nextItem(function (err, doc) {
                                            assert.equal(err, undefined, "error querying documents");
                                            assert.equal(doc, undefined, "queryIterator should return undefined if there is no elements");
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        };

        it("[nativeApi] validate queryIterator nextItem and hasMoreResults [name based]", function(done) {
            queryIteratorNextAndMoreTest(true, done);
        });

        it("[nativeApi] validate queryIterator nextItem and hasMoreResults [rid based]", function (done) {
            queryIteratorNextAndMoreTest(false, done);
        });

        var queryIteratorExecuteNextTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            createResources(isNameBased, client, function (resources) {
                var queryIterator = client.readDocuments(getCollectionLink(isNameBased, resources.db, resources.coll), { maxItemCount: 2 });
                queryIterator.executeNext(function (err, docs, headers) {
                    assert.equal(err, undefined, "error reading documents");
                    assert(headers !== undefined, "executeNext should pass headers as the third parameter to the callback");
                    assert.equal(docs.length, 2, "first batch size should be 2");
                    assert.equal(docs[0].id, resources.doc1.id, "first batch first document should be doc1");
                    assert.equal(docs[1].id, resources.doc2.id, "batch first second document should be doc2");
                    queryIterator.executeNext(function (err, docs) {
                        assert.equal(err, undefined, "error reading documents");
                        assert.equal(docs.length, 1, "second batch size should be 2");
                        assert.equal(docs[0].id, resources.doc3.id, "second batch element should be doc3");
                        done();
                    });
                });
            });
        };

        it("[nativeApi] validate queryIterator iterator executeNext [name based]", function(done) {
            queryIteratorExecuteNextTest(true, done);
        });

        it("[nativeApi] validate queryIterator iterator executeNext [rid based]", function (done) {
            queryIteratorExecuteNextTest(false, done);
        });
    });

    describe("validate trigger functionality", function() {
        var triggers = [
            {
                id: "t1",
                body: function() {
                    var item = getContext().getRequest().getBody();
                    item.id = item.id.toUpperCase() + "t1";
                    getContext().getRequest().setBody(item);
                },
                triggerType: DocumentBase.TriggerType.Pre,
                triggerOperation: DocumentBase.TriggerOperation.All
            },
            {
                id: "t2",
                body: "function() { }", // trigger already stringified
                triggerType: DocumentBase.TriggerType.Pre,
                triggerOperation: DocumentBase.TriggerOperation.All
            },
            {
                id: "t3",
                body: function() {
                    var item = getContext().getRequest().getBody();
                    item.id = item.id.toLowerCase() + "t3";
                    getContext().getRequest().setBody(item);
                },
                triggerType: DocumentBase.TriggerType.Pre,
                triggerOperation: DocumentBase.TriggerOperation.All
            },
            {
                id: "response1",
                body: function() {
                    var prebody = getContext().getRequest().getBody();
                    if (prebody.id !== "TESTING POST TRIGGERt1") throw "name mismatch";
                    var postbody = getContext().getResponse().getBody();
                    if (postbody.id !== "TESTING POST TRIGGERt1") throw "name mismatch";
                },
                triggerType: DocumentBase.TriggerType.Post,
                triggerOperation: DocumentBase.TriggerOperation.All
            },
            {
                id: "triggerOpType",
                body: "function() { }",
                triggerType: DocumentBase.TriggerType.Post,
                triggerOperation: DocumentBase.TriggerOperation.Delete
            }
        ];

        var createTriggers = function(client, collection, index, callback) {
            if (index === triggers.length) {
                return callback();
            }

            client.createTrigger(collection._self, triggers[index], function (err, trigger) {
                assert.equal(err, undefined, "error creating trigger");
                for (var property in triggers[index]) {
                    assert.equal(trigger[property], triggers[index][property], "property " + property + " should match");
                }

                createTriggers(client, collection, index + 1, callback);
            });
        };

        var triggerCRUDTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            // create database
            client.createDatabase({ id: "sample database" }, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                // create collection
                client.createCollection(getDatabaseLink(isNameBased, db), { id: "sample collection" }, function (err, collection) {
                    assert.equal(err, undefined, "error creating collection");
                    // create triggers
                    createTriggers(client, collection, 0, function () {
                        assert.equal(err, undefined, "error creating trigger");
                        // create document
                        client.readTriggers(getCollectionLink(isNameBased, db, collection)).toArray(function (err, triggers) {
                            assert.equal(err, undefined, "error reading triggers");
                            client.createDocument(getCollectionLink(isNameBased, db, collection), { id: "doc1", key: "value" }, { preTriggerInclude: "t1" }, function (err, document) {
                                assert.equal(err, undefined, "error creating document");
                                assert.equal(document.id, "DOC1t1", "name should be capitalized");
                                client.createDocument(getCollectionLink(isNameBased, db, collection), { id: "doc2", key2: "value2" }, { preTriggerInclude: "t2" }, function (err, document2) {
                                    assert.equal(err, undefined, "error creating document");
                                    assert.equal(document2.id, "doc2", "name shouldn't change");
                                    client.createDocument(getCollectionLink(isNameBased, db, collection), { id: "Doc3", prop: "empty" }, { preTriggerInclude: "t3" }, function (err, document3) {
                                        assert.equal(err, undefined, "error creating document");
                                        assert.equal(document3.id, "doc3t3");
                                        client.createDocument(getCollectionLink(isNameBased, db, collection), { id: "testing post trigger" }, { postTriggerInclude: "response1", preTriggerInclude: "t1" }, function (err, document4) {
                                            assert.equal(err, undefined, "error creating document");
                                            assert.equal(document4.id, "TESTING POST TRIGGERt1");
                                            client.createDocument(getCollectionLink(isNameBased, db, collection), { id: "responseheaders" }, { preTriggerInclude: "t1" }, function (err, document5, headers) {
                                                assert.equal(err, undefined, "error creating document");
                                                assert.equal(document5.id, "RESPONSEHEADERSt1");
                                                client.createDocument(getCollectionLink(isNameBased, db, collection), { id: "Docoptype" }, { postTriggerInclude: "triggerOpType" }, function (err, document6) {
                                                    assert(err !== undefined);
                                                    done();
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        };

        it("[nativeApi] Should do trigger operations successfully [name based]", function(done) {
            triggerCRUDTest(true, done);
        });

        it("[nativeApi] Should do trigger operations successfully [rid based]", function (done) {
            triggerCRUDTest(false, done);
        });
    });

    describe("validate stored procedure functionality", function () {
        var storedProcedureCRUDTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            // create database
            client.createDatabase({ id: "sample database" }, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                // create collection
                client.createCollection(getDatabaseLink(isNameBased, db), { id: "sample collection" }, function (err, collection) {
                    assert.equal(err, undefined, "error creating collection");
                    var sproc1 = {
                        id: "storedProcedure1",
                        body: function () {
                            for (var i = 0; i < 1000; i++) {
                                var item = getContext().getResponse().getBody();
                                if (i > 0 && item !== i - 1) throw "body mismatch";
                                getContext().getResponse().setBody(i);
                            }
                        }
                    };

                    client.createStoredProcedure(getCollectionLink(isNameBased, db, collection), sproc1, function (err, retrievedSproc) {
                        assert.equal(err, undefined, "error creating stored procedure");
                        client.executeStoredProcedure(getStoredProcedureLink(isNameBased, db, collection, retrievedSproc), function (err, result) {
                            assert.equal(err, undefined, "error executing stored procedure");
                            assert.equal(result, 999);
                            var sproc2 = {
                                id: "storedProcedure2",
                                body: function () {
                                    for (var i = 0; i < 10; i++) getContext().getResponse().appendValue("Body", i);
                                }
                            };

                            client.createStoredProcedure(getCollectionLink(isNameBased, db, collection), sproc2, function (err, retrievedSproc2) {
                                assert.equal(err, undefined, "error creating stored procedure");
                                client.executeStoredProcedure(getStoredProcedureLink(isNameBased, db, collection, retrievedSproc2), function (err, result) {
                                    assert.equal(err, undefined, "error executing stored procedure");
                                    assert.equal(result, 123456789);
                                    var sproc3 = {
                                        id: "storedProcedure3",
                                        body: function (input) {
                                            getContext().getResponse().setBody("a" + input.temp);
                                        }
                                    };

                                    client.createStoredProcedure(getCollectionLink(isNameBased, db, collection), sproc3, function (err, retrievedSproc3) {
                                        assert.equal(err, undefined, "error creating stored procedure");
                                        client.executeStoredProcedure(getStoredProcedureLink(isNameBased, db, collection, retrievedSproc3), { temp: "so" }, function (err, result) {
                                            assert.equal(err, undefined, "error executing stored procedure");
                                            assert.equal(result, "aso");
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        };

        it("[nativeApi] Should do stored procedure operations successfully [name based]", function (done) {
            storedProcedureCRUDTest(true, done);
        });

        it("[nativeApi] Should do stored procedure operations successfully [rid based]", function (done) {
            storedProcedureCRUDTest(false, done);
        });
    });

    describe("Validate Offer CRUD", function () {
        var validateOfferResponseBody = function (offer, expectedCollLink, expectedOfferType) {
            assert(offer.id, "Id cannot be null");
            assert(offer._rid, "Resource Id (Rid) cannot be null");
            assert(offer._self, "Self Link cannot be null");
            assert(offer.resource, "Resource Link cannot be null");
            assert(offer._self.indexOf(offer.id) !== -1, "Offer id not contained in offer self link.");
            assert.equal(expectedCollLink.replace(/^\/|\/$/g, ""), offer.resource.replace(/^\/|\/$/g, ""));
            if (expectedOfferType) {
                assert.equal(expectedOfferType, offer.offerType);
            }
        };

        var offerReadAndQueryTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            // create database
            client.createDatabase({ id: "sample database" }, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                // create collection
                client.createCollection(getDatabaseLink(isNameBased, db), { id: "sample collection" }, function (err, collection) {
                    assert.equal(err, undefined, "error creating collection");
                    client.readOffers({}).toArray(function (err, offers) {
                        assert.equal(err, undefined, "error reading offers");
                        assert.equal(offers.length, 1);
                        var expectedOffer = offers[0];
                        validateOfferResponseBody(expectedOffer, collection._self, undefined);
                        // Read the offer
                        client.readOffer(expectedOffer._self, function (err, readOffer) {
                            assert.equal(err, undefined, "error reading offer");
                            validateOfferResponseBody(readOffer, collection._self, undefined);
                            // Check if the read offer is what we expected.
                            assert.equal(expectedOffer.id, readOffer.id);
                            assert.equal(expectedOffer._rid, readOffer._rid);
                            assert.equal(expectedOffer._self, readOffer._self);
                            assert.equal(expectedOffer.resource, readOffer.resource);
                            // Read offer with a bad offer link.
                            var badLink = expectedOffer._self.substring(0, expectedOffer._self.length - 1) + "x/";
                            client.readOffer(badLink, function (err, _) {
                                var notFoundErrorCode = 400;
                                assert.equal(err.code, notFoundErrorCode, "response should return error code 404");

                                // Query for offer.
                                var querySpec = {
                                    query: "select * FROM root r WHERE r.id=@id",
                                    parameters: [
                                        {
                                            name: "@id",
                                            value: expectedOffer.id
                                        }
                                    ]
                                };
                                client.queryOffers(querySpec).toArray(function (err, offers) {
                                    assert.equal(err, undefined, "error querying offers");
                                    assert.equal(offers.length, 1);
                                    var oneOffer = offers[0];
                                    validateOfferResponseBody(oneOffer, collection._self, undefined);
                                    // Now delete the collection.
                                    client.deleteCollection(getCollectionLink(isNameBased, db, collection), function (err, _) {
                                        assert.equal(err, undefined, "error deleting collection");
                                        // read offer after deleting collection.
                                        client.readOffer(expectedOffer._self, function (err, _) {
                                            var notFoundErrorCode = 404;
                                            assert.equal(err.code, notFoundErrorCode, "response should return error code 404");
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        };

        it("[nativeApi] Should do offer read and query operations successfully [name based]", function (done) {
            offerReadAndQueryTest(true, done);
        });

        it("[nativeApi] Should do offer read and query operations successfully [rid based]", function (done) {
            offerReadAndQueryTest(false, done);
        });

        var offerReplaceTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            // create database
            client.createDatabase({ id: "sample database" }, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                // create collection
                client.createCollection(getDatabaseLink(isNameBased, db), { id: "sample collection" }, function (err, collection) {
                    assert.equal(err, undefined, "error creating collection");
                    client.readOffers().toArray(function (err, offers) {
                        assert.equal(err, undefined, "error reading offers");
                        assert.equal(offers.length, 1);
                        var expectedOffer = offers[0];
                        validateOfferResponseBody(expectedOffer, collection._self, undefined);
                        // Replace the offer.
                        var offerToReplace = Base.extend({}, expectedOffer);
                        offerToReplace.offerType = "S2";
                        client.replaceOffer(offerToReplace._self, offerToReplace, function (err, replacedOffer) {
                            assert.equal(err, undefined, "error replacing offer");
                            validateOfferResponseBody(replacedOffer, collection._self, "S2");
                            // Check if the replaced offer is what we expect.
                            assert.equal(replacedOffer.id, offerToReplace.id);
                            assert.equal(replacedOffer._rid, offerToReplace._rid);
                            assert.equal(replacedOffer._self, offerToReplace._self);
                            assert.equal(replacedOffer.resource, offerToReplace.resource);
                            // Replace an offer with a bad id.
                            var offerBadId = Base.extend({}, offerToReplace);
                            offerBadId._rid = "NotAllowed";
                            client.replaceOffer(offerBadId._self, offerBadId, function (err, _) {
                                var badRequestErrorCode = 400;
                                assert.equal(err.code, badRequestErrorCode);
                                // Replace an offer with a bad rid.
                                var offerBadRid = Base.extend({}, offerToReplace);
                                offerBadRid._rid = "InvalidRid";
                                client.replaceOffer(offerBadRid._self, offerBadRid, function (err, _) {
                                    var badRequestErrorCode = 400;
                                    assert.equal(err.code, badRequestErrorCode);
                                    // Replace an offer with null id and rid.
                                    var offerNullId = Base.extend({}, offerToReplace);
                                    offerNullId.id = undefined;
                                    offerNullId._rid = undefined;
                                    client.replaceOffer(offerNullId._self, offerNullId, function (err, _) {
                                        var badRequestErrorCode = 400;
                                        assert.equal(err.code, badRequestErrorCode);
                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        };

        it("[nativeApi] Should do offer replace operations successfully [name based]", function (done) {
            offerReplaceTest(true, done);
        });

        it("[nativeApi] Should do offer replace operations successfully [rid based]", function (done) {
            offerReplaceTest(false, done);
        });

        var createCollectionWithOfferTypeTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            // create database
            client.createDatabase({ id: "sample database" }, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                // create collection
                client.createCollection(getDatabaseLink(isNameBased, db), { id: "sample collection" }, { offerType: "S2" }, function (err, collection) {
                    assert.equal(err, undefined, "error creating collection");
                    client.readOffers().toArray(function (err, offers) {
                        assert.equal(err, undefined, "error reading offers");
                        assert.equal(offers.length, 1);
                        var expectedOffer = offers[0];
                        assert.equal(expectedOffer.offerType, "S2");
                        done();
                    });
                });
            });
        };

        it("[nativeApi] Should create collection with specified offer type successfully [name based]", function (done) {
            createCollectionWithOfferTypeTest(true, done);
        });

        it("[nativeApi] Should create collection with specified offer type successfully [rid based]", function (done) {
            createCollectionWithOfferTypeTest(false, done);
        });
    });

    describe("validate database account functionality", function () {
        var databaseAccountTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            client.getDatabaseAccount(function (err, databaseAccount, headers) {
                assert.equal(err, undefined, "error getting database account");
                assert.equal(databaseAccount.DatabasesLink, "/dbs/");
                assert.equal(databaseAccount.MediaLink, "/media/");
                assert.equal(databaseAccount.MaxMediaStorageUsageInMB, headers["x-ms-max-media-storage-usage-mb"]);
                assert.equal(databaseAccount.CurrentMediaStorageUsageInMB, headers["x-ms-media-storage-usage-mb"]);
                assert(databaseAccount.ConsistencyPolicy.defaultConsistencyLevel !== undefined);
                done();
            });
        };

        it("[nativeApi] Should get database account successfully [name based]", function (done) {
            databaseAccountTest(true, done);
        });

        it("[nativeApi] Should get database account successfully [rid based]", function (done) {
            databaseAccountTest(false, done);
        });
    });

    describe("Validate response headers", function () {
        var createThenReadCollection = function (isNameBased, client, db, body, callback) {
            client.createCollection(getDatabaseLink(isNameBased, db), body, function (err, collection, headers) {
                assert.equal(err, undefined, "error creating collection");
                client.readCollection(getCollectionLink(isNameBased, db, collection), function (err, collection, headers) {
                    assert.equal(err, undefined, "error reading collection");
                    callback(collection, headers);
                });
            });
        };

        var indexProgressHeadersTest = function (isNameBased, done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            client.createDatabase({ id: "sample database" }, function (err, db) {
                assert.equal(err, undefined, "error creating database");
                createThenReadCollection(isNameBased, client, db, { id: "consistent_coll" }, function (collection, headers) {
                    assert.notEqual(headers[Constants.HttpHeaders.IndexTransformationProgress], undefined);
                    assert.equal(headers[Constants.HttpHeaders.LazyIndexingProgress], undefined);
                    var lazyCollectionDefinition = {
                        id: "lazy_coll",
                        indexingPolicy: { indexingMode: DocumentBase.IndexingMode.Lazy }
                    };
                    createThenReadCollection(isNameBased, client, db, lazyCollectionDefinition, function (collection, headers) {
                        assert.notEqual(headers[Constants.HttpHeaders.IndexTransformationProgress], undefined);
                        var noneCollectionDefinition = {
                            id: "none_coll",
                            indexingPolicy: { indexingMode: DocumentBase.IndexingMode.None, automatic: false }
                        };
                        createThenReadCollection(isNameBased, client, db, noneCollectionDefinition, function (collection, headers) {
                            assert.notEqual(headers[Constants.HttpHeaders.IndexTransformationProgress], undefined);
                            done();
                        });
                    });
                });
            });
        };

        it("[nativeApi] Validate index progress headers [name based]", function (done) {
            indexProgressHeadersTest(true, done);
        });

        it("[nativeApi] Validate index progress headers [rid based]", function (done) {
            indexProgressHeadersTest(true, done);
        });
    });

    describe("Validate Id validation", function () {
        it("[nativeApi] Should fail on illegal Ids.", function (done) {
            var client = new DocumentDBClient(host, { masterKey: masterKey });
            // Id shoudn't end with a space.
            client.createDatabase({ id: "id_ends_with_space " }, function (err, db) {
                assert.equal("Id ends with a space.", err.message);

                // Id shoudn't contain "/".
                client.createDatabase({ id: "id_with_illegal/_char" }, function (err, db) {
                    assert.equal("Id contains illegal chars.", err.message);

                    // Id shoudn't contain "\\".
                    client.createDatabase({ id: "id_with_illegal\\_char" }, function (err, db) {
                        assert.equal("Id contains illegal chars.", err.message);

                        // Id shoudn't contain "?".
                        client.createDatabase({ id: "id_with_illegal?_?char" }, function (err, db) {
                            assert.equal("Id contains illegal chars.", err.message);

                            // Id shoudn't contain "#".
                            client.createDatabase({ id: "id_with_illegal#_char" }, function (err, db) {
                                assert.equal("Id contains illegal chars.", err.message);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });
});
