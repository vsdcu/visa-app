
/*
SPDX-License-Identifier: Apache-2.0
*/
'use strict';

const State = require('../ledger-api/state.js');
//const VisaApp = require('./visaapp.js');
/**
 * Query Class for query functions such as history etc
 *
 */
class QueryUtils {

    constructor(ctx, listName) {
        this.ctx = ctx;
        this.name = listName;
        //this.supportedTypes = {};
    }

    // =========================================================================================
    // getAssetHistory takes the composite key as arg, gets returns results as JSON to 'main contract'
    // =========================================================================================
    /**
    * Get Asset History for a visa application
    * @param {String} issuer the application raiser
    * @param {String} applicationNumber visa application number
    */
    async getAssetHistory(issuer, applicationNumber) {

        let ledgerKey = await this.ctx.stub.createCompositeKey(this.name, [issuer, applicationNumber]);
        const resultsIterator = await this.ctx.stub.getHistoryForKey(ledgerKey);
        let results = await this.getAllResults(resultsIterator, true);

        return results;
    }

    // ===========================================================================================
    // queryKeyByPartial performs a partial query based on the namespace and  asset key prefix provided

    // Read-only function results are not typically submitted to ordering. If the read-only
    // results are submitted to ordering, or if the query is used in an update transaction
    // and submitted to ordering, then the committing peers will re-execute to guarantee that
    // result sets are stable between endorsement time and commit time. The transaction is
    // invalidated by the committing peers if the result set has changed between endorsement
    // time and commit time.
    // 
    // ===========================================================================================
    /**
    * queryOwner visa application
    * @param {String} assetspace the asset space (eg visa world's applications)
    */
    async queryKeyByPartial(assetspace) {

        if (arguments.length < 1) {
            throw new Error('Incorrect number of arguments. Expecting 1');
        }
        // ie namespace + prefix to assets etc eg 
        // "Key":"org.visanet.visaappVisaWorld0001"   (0002, etc)
        // "Partial":'org.visanet.visaapplistVisaWorld"'  (using partial key, find keys "0001", "0002" etc)
        const resultsIterator = await this.ctx.stub.getStateByPartialCompositeKey(this.name, [assetspace]);
        let method = this.getAllResults;
        let results = await method(resultsIterator, false);

        return results;
    }


    // ===== Example: Parameterized rich query =================================================
    // queryKeyByOwner queries for assets based on a passed in owner.
    // This is an example of a parameterized query accepting a single query parameter (owner).
    // Only available on state databases that support rich query (e.g. CouchDB)
    // =========================================================================================
    /**
    * queryKeyByOwner visa application
    * @param {String} owner visa application owner
    */
    async queryKeyByOwner(owner) {
        //  
        let self = this;
        if (arguments.length < 1) {
            throw new Error('Incorrect number of arguments. Expecting owner name.');
        }
        let queryString = {};
        queryString.selector = {};
        //  queryString.selector.docType = 'indexOwnerDoc';
        queryString.selector.owner = owner;
        // set to (eg)  '{selector:{owner:VisaWorld}}'
        let method = self.getQueryResultForQueryString;
        let queryResults = await method(this.ctx, self, JSON.stringify(queryString));
        return queryResults;
    }

    // ===== Example: Ad hoc rich query ========================================================
    // queryAdhoc uses a query string to perform a query for marbles..
    // Query string matching state database syntax is passed in and executed as is.
    // Supports ad hoc queries that can be defined at runtime by the client.
    // If this is not desired, follow the queryKeyByOwner example for parameterized queries.
    // Only available on state databases that support rich query (e.g. CouchDB)
    // example passed using VS Code ext: ["{\"selector\": {\"owner\": \"VisaWorld\"}}"]
    // =========================================================================================
    /**
    * query By AdHoc string (visa application)
    * @param {String} queryString actual MongoDB query string (escaped)
    */
    async queryByAdhoc(queryString) {

        if (arguments.length < 1) {
            throw new Error('Incorrect number of arguments. Expecting ad-hoc string, which gets stringified for mongo query');
        }
        let self = this;

        if (!queryString) {
            throw new Error('queryString must not be empty');
        }
        let method = self.getQueryResultForQueryString;
        let queryResults = await method(this.ctx, self, JSON.stringify(queryString));
        return queryResults;
    }

    // WORKER functions are below this line: these are called by the above functions, where iterator is passed in

    // =========================================================================================
    // getQueryResultForQueryString worker function executes the passed-in query string.
    // Result set is built and returned as a byte array containing the JSON results.
    // =========================================================================================
    /**
     * Function getQueryResultForQueryString
     * @param {Context} ctx the transaction context
     * @param {any}  self within scope passed in
     * @param {String} the query string created prior to calling this fn
    */
    async getQueryResultForQueryString(ctx, self, queryString) {

        // console.log('- getQueryResultForQueryString queryString:\n' + queryString);

        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        let results = await self.getAllResults(resultsIterator, false);

        return results;

    }

    /**
     * Function getAllResults
     * @param {resultsIterator} iterator within scope passed in
     * @param {Boolean} isHistory query string created prior to calling this fn
    */
    async getAllResults(iterator, isHistory) {
        let allResults = [];
        let res = { done: false, value: null };

        while (true) {
            res = await iterator.next();
            let jsonRes = {};
            if (res.value && res.value.value.toString()) {
                if (isHistory && isHistory === true) {
                    //jsonRes.TxId = res.value.tx_id;
                    jsonRes.TxId = res.value.txId;
                    jsonRes.Timestamp = res.value.timestamp;
                    jsonRes.Timestamp = new Date((res.value.timestamp.seconds.low * 1000));
                    let ms = res.value.timestamp.nanos / 1000000;
                    jsonRes.Timestamp.setMilliseconds(ms);
                    if (res.value.is_delete) {
                        jsonRes.IsDelete = res.value.is_delete.toString();
                    } else {
                        try {
                            jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
                            // report the visa application states during the asset lifecycle, just for asset history reporting
                            switch (jsonRes.Value.currentState) {
                                case 1:
                                    jsonRes.Value.currentState = 'NEW';
                                    break;
                                case 2:
                                    jsonRes.Value.currentState = 'DOCS_CHK_PASS';
                                    break;
                                case 3:
                                    jsonRes.Value.currentState = 'DOCS_CHK_FAIL';
                                    break;
                                case 4:
                                    jsonRes.Value.currentState = 'HISTORY_CHK_PASS';
                                    break;
                                case 5:
                                    jsonRes.Value.currentState = 'HISTORY_CHK_FAIL';
                                    break;
                                case 6:
                                    jsonRes.Value.currentState = 'APPROVED';
                                    break;
                                case 7:
                                    jsonRes.Value.currentState = 'DECLINED';
                                    break;
                                default: // else, unknown named query
                                    jsonRes.Value.currentState = 'UNKNOWN';
                            }

                        } catch (err) {
                            console.log(err);
                            jsonRes.Value = res.value.value.toString('utf8');
                        }
                    }
                } else { // non history query ..
                    jsonRes.Key = res.value.key;
                    try {
                        jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
                    } catch (err) {
                        console.log(err);
                        jsonRes.Record = res.value.value.toString('utf8');
                    }
                }
                allResults.push(jsonRes);
            }
            // check to see if we have reached the end
            if (res.done) {
                // explicitly close the iterator 
                console.log('iterator is done');
                await iterator.close();
                return allResults;
            }

        }  // while true
    }

}
module.exports = QueryUtils;
