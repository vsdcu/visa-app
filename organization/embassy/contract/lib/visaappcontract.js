/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
*/

'use strict';

// Fabric smart contract classes
const { Contract, Context } = require('fabric-contract-api');

// VisaNet specifc classes
const VisaApplication = require('./visaapp.js');
const VisaApplicationList = require('./visaapplist.js');
const QueryUtils = require('./queries.js');

/**
 * A custom context provides easy access to list of all visa applications
 */
class VisaApplicationContext extends Context {

    constructor() {
        super();
        // All applications are held in a list of visa applications
        this.visaApplicationList = new VisaApplicationList(this);
    }

}

/**
 * Define visa application smart contract by extending Fabric Contract class
 *
 */
class VisaApplicationContract extends Contract {

    constructor() {
        // Unique namespace when multiple contracts per chaincode file
        super('org.visanet.visaapp');
    }

    /**
     * Define a custom context for visa app
    */
    createContext() {
        return new VisaApplicationContext();
    }

    /**
     * Instantiate to perform any setup of the ledger that might be required.
     * @param {Context} ctx the transaction context
     */
    async instantiate(ctx) {
        // No implementation required with this example
        // It could be where data migration is performed, if necessary
        console.log('Instantiate the contract');
    }

    /**
     * Visa application submit
     *
     * @param {Context} ctx the transaction context
     * @param {String} submitter who submit the application (typically an agency on behalf of their customers)
     * @param {Integer} applicationNumber application number for this submitter
     * @param {String} submissionDateTime submission date
    */
    async appsubmit(ctx, submitter, applicationNumber, submissionDateTime) {

        console.log('>>>>>>>>>>>>>>>>> VisaAppContract::appsubmit <<<<<<<<<<<<<<<<< applicationNumber: ', applicationNumber);

        // create an instance of the contract
        let visaApp = VisaApplication.createInstance(submitter, applicationNumber, submissionDateTime);

        // Smart contract, moves application into New state
        visaApp.setNew();

        // save the owner's MSP 
        let mspid = ctx.clientIdentity.getMSPID();
        visaApp.setOwnerMSP(mspid);

        // Newly issued application is owned by the submitter to begin with (recorded for reporting purposes)
        visaApp.setOwner(submitter);

        // Add the application to the list of all similar cvisa applications in the ledger world state
        await ctx.visaApplicationList.addVisaApplication(visaApp);

        // Must return a serialized application to caller of smart contract
        return visaApp;
    }

    /**
     * Marking Documents check passed for the Visa Application
     *
     * @param {Context} ctx the transaction context
     * @param {String} submitterOrg application submitter, VisaWorld
     * @param {Integer} applicationNumber application number
     * @param {String} approvingOrgMSP approving entity
     * @param {String} previousMSP the MSP of the org that performed last action on the visa application.
     * @param {String} approvingDateTime time application was approved
    */
    async documentcheckpass(ctx, submitterOrg, applicationNumber, approvingOrgMSP, previousMSP, approvingDateTime) {

        console.log('>>>>>>>>>>>>>>>>> VisaAppContract::documentcheckpass <<<<<<<<<<<<<<<<< applicationNumber: ', applicationNumber);

        let applicationKey = VisaApplication.makeKey([submitterOrg, applicationNumber]);

        let visaApplication = await ctx.visaApplicationList.getVisaApplication(applicationKey);

        //console.log('historycheck visaApplication fetched :', visaApplication);

        // Check application is not already in final decision i.e. approved/declined
        if (visaApplication.isApproved() || visaApplication.isDeclined()) {
            console.log('Decision is already given on Visa application ' + submitterOrg + applicationNumber + '. Final decision: ' + visaApplication.currentState);
            throw new Error('\nDecision is already given on Visa application ' + submitterOrg + applicationNumber + ' Final decision: ' + visaApplication.currentState);
        }

        // Check application is not already history check passed or failed
        if (visaApplication.isHistoryChkFailed()) {
            console.log('History check is already concluded for Visa application ' + submitterOrg + applicationNumber + '. Final decision: ' + visaApplication.currentState);
            throw new Error('\nHistory check is already concluded for Visa application ' + submitterOrg + applicationNumber + ' Final decision: ' + visaApplication.currentState);
        }

        // Check application is not in documents check failed state.
        if (visaApplication.isDocChkPassed() || visaApplication.isDocChkFailed()) {
            console.log('Documents check is already concluded for Visa application ' + submitterOrg + applicationNumber + '. Final decision: ' + visaApplication.currentState);
            throw new Error('\nDocuments check is already concluded for Visa application ' + submitterOrg + applicationNumber + ' Final decision: ' + visaApplication.currentState);
        }

        let mspid = ctx.clientIdentity.getMSPID(); //embassy
        //console.log('>>>>>>>>> vinit >>>>>>>> MSPid for approving org (police) :', mspid);

        // Validate approver's MSP matches the invoking entity MSP id - can only approve if you are the approving org. i.e. Police
        if (approvingOrgMSP !== mspid) {
            console.log('Application ' + submitterOrg + applicationNumber + ' cannot be approved by ' + ctx.clientIdentity.getMSPID() + ', as it is not the authorised owning Organisation');
            throw new Error('\nApplication ' + submitterOrg + applicationNumber + ' cannot be approved by ' + ctx.clientIdentity.getMSPID() + ', as it is not the authorised owning Organisation');
        }

        // Debug output to verify owner
        //console.log('Current owner of application ' + submitterOrg + applicationNumber + ':', visaApplication.getOwner());

        //let dnName = ctx.clientIdentity.getOwner();

        // if the application submitter MSP matches the application owner MSP
        if (visaApplication.getOwnerMSP() === previousMSP) {
            console.log('Owner matches submitter. History clearence given for visa application: ', applicationNumber);
            //visaApplication.setOwner(dnName); 
            visaApplication.setOwnerMSP(mspid); // setting embassy
            visaApplication.setDocChkPassed();
            visaApplication.approvingDateTime = approvingDateTime;
        } else {
            console.log('Submitter does not own the application:', previousMSP);
            throw new Error('\nowner: ' + submitterOrg + ' organisation does not currently own application: ' + submitterOrg + applicationNumber);
        }

        await ctx.visaApplicationList.updateVisaApplication(visaApplication);
        return visaApplication;
    }

    /**
     * Marking Documents check failed for the Visa Application
     *
     * @param {Context} ctx the transaction context
     * @param {String} submitterOrg application submitter, VisaWorld
     * @param {Integer} applicationNumber application number
     * @param {String} approvingOrgMSP approving entity
     * @param {String} previousMSP the MSP of the org that performed last action on the visa application.
     * @param {String} approvingDateTime time application was approved
    */
    async documentcheckfail(ctx, submitterOrg, applicationNumber, approvingOrgMSP, previousMSP, approvingDateTime) {

        console.log('>>>>>>>>>>>>>>>>> VisaAppContract::documentcheckfail <<<<<<<<<<<<<<<<< applicationNumber: ', applicationNumber);

        let applicationKey = VisaApplication.makeKey([submitterOrg, applicationNumber]);

        let visaApplication = await ctx.visaApplicationList.getVisaApplication(applicationKey);

        //console.log('>>>>>>>>> vinit >>>>>>>> historycheck visaApplication fetched :', visaApplication);

        // Check application is not already in final decision i.e. approved/declined
        if (visaApplication.isApproved() || visaApplication.isDeclined()) {
            console.log('Decision is already given on Visa application ' + submitterOrg + applicationNumber + '. Final decision: ' + visaApplication.currentState);
            throw new Error('\nDecision is already given on Visa application ' + submitterOrg + applicationNumber + ' Final decision: ' + visaApplication.currentState);
        }

        // Check application is not already history check passed or failed
        if (visaApplication.isHistoryChkFailed()) {
            console.log('History check is already concluded for Visa application ' + submitterOrg + applicationNumber + '. Final decision: ' + visaApplication.currentState);
            throw new Error('\nHistory check is already concluded for Visa application ' + submitterOrg + applicationNumber + ' Final decision: ' + visaApplication.currentState);
        }

        // Check application is not in documents check failed state.
        if (visaApplication.isDocChkPassed() || visaApplication.isDocChkFailed()) {
            console.log('Documents check is already concluded for Visa application ' + submitterOrg + applicationNumber + '. Final decision: ' + visaApplication.currentState);
            throw new Error('\nDocuments check is already concluded for Visa application ' + submitterOrg + applicationNumber + ' Final decision: ' + visaApplication.currentState);
        }

        let mspid = ctx.clientIdentity.getMSPID(); //embassy
        //console.log('>>>>>>>>> vinit >>>>>>>> MSPid for approving org (police) :', mspid);

        // Validate approver's MSP matches the invoking entity MSP id - can only approve if you are the approving org. i.e. Police
        if (approvingOrgMSP !== mspid) {
            console.log('Application ' + submitterOrg + applicationNumber + ' cannot be approved by ' + ctx.clientIdentity.getMSPID() + ', as it is not the authorised owning Organisation');
            throw new Error('\nApplication ' + submitterOrg + applicationNumber + ' cannot be approved by ' + ctx.clientIdentity.getMSPID() + ', as it is not the authorised owning Organisation');
        }

        // Debug output to verify owner
        //console.log('Current owner of application ' + submitterOrg + applicationNumber + ':', visaApplication.getOwner());

        // if the application submitter MSP matches the application owner MSP
        if (visaApplication.getOwnerMSP() === previousMSP) {
            console.log('Owner matches submitter. History clearence given for visa application: ', applicationNumber);
            //visaApplication.setOwner(dnName); 
            visaApplication.setOwnerMSP(mspid); // setting embassy
            visaApplication.setDocChkFailed();
            visaApplication.approvingDateTime = approvingDateTime;
        } else {
            console.log('Submitter does not own the application:', previousMSP);
            throw new Error('\nowner: ' + submitterOrg + ' organisation does not currently own application: ' + submitterOrg + applicationNumber);
        }

        await ctx.visaApplicationList.updateVisaApplication(visaApplication);
        return visaApplication;
    }


    /**
     * Clearence of History check for the Visa Application
     *
     * @param {Context} ctx the transaction context
     * @param {String} submitterOrg application submitter, VisaWorld
     * @param {Integer} applicationNumber application number
     * @param {String} approvingOrgMSP approving entity
     * @param {String} previousMSP the MSP of the org that performed last action on the visa application.
     * @param {String} approvingDateTime time application was approved
    */
    async historycheckpass(ctx, submitterOrg, applicationNumber, approvingOrgMSP, previousMSP, approvingDateTime) {

        console.log('>>>>>>>>>>>>>>>>> VisaAppContract::historycheckpass <<<<<<<<<<<<<<<<< applicationNumber: ', applicationNumber);

        let applicationKey = VisaApplication.makeKey([submitterOrg, applicationNumber]);

        let visaApplication = await ctx.visaApplicationList.getVisaApplication(applicationKey);

        //console.log('>>>>>>>>> vinit >>>>>>>> historycheck visaApplication fetched :', visaApplication);

        // Check application is not already in final decision i.e. approved/declined
        if (visaApplication.isApproved() || visaApplication.isDeclined()) {
            console.log('Decision is already given on Visa application ' + submitterOrg + applicationNumber + '. Final decision: ' + visaApplication.currentState);
            throw new Error('\nDecision is already given on Visa application ' + submitterOrg + applicationNumber + ' Final decision: ' + visaApplication.currentState);
        }

        // Check application is not already history check passed or failed
        if (visaApplication.isHistoryChkPassed() || visaApplication.isHistoryChkFailed()) {
            console.log('History check is already concluded for Visa application ' + submitterOrg + applicationNumber + '. Final decision: ' + visaApplication.currentState);
            throw new Error('\nHistory check is already concluded for Visa application ' + submitterOrg + applicationNumber + ' Final decision: ' + visaApplication.currentState);
        }

        let mspid = ctx.clientIdentity.getMSPID(); //embassy
        //console.log('>>>>>>>>> vinit >>>>>>>> MSPid for approving org (police) :', mspid);

        // Validate approver's MSP matches the invoking entity MSP id - can only approve if you are the approving org. i.e. Police
        if (approvingOrgMSP !== mspid) {
            console.log('Application ' + submitterOrg + applicationNumber + ' cannot be approved by ' + ctx.clientIdentity.getMSPID() + ', as it is not the authorised owning Organisation');
            throw new Error('\nApplication ' + submitterOrg + applicationNumber + ' cannot be approved by ' + ctx.clientIdentity.getMSPID() + ', as it is not the authorised owning Organisation');
        }

        // Debug output to verify owner
        //console.log('Current owner of application ' + submitterOrg + applicationNumber + ':', visaApplication.getOwner());

        //let dnName = ctx.clientIdentity.getOwner();

        // if the application submitter MSP matches the application owner MSP
        if (visaApplication.getOwnerMSP() === previousMSP) {
            console.log('Owner matches submitter. History clearence given for visa application: ', applicationNumber);
            //visaApplication.setOwner(dnName);
            visaApplication.setOwnerMSP(mspid); // setting embassy
            visaApplication.setHistoryChkPassed();
            visaApplication.approvingDateTime = approvingDateTime;
        } else {
            console.log('Submitter does not own the application:', previousMSP);
            throw new Error('\nowner: ' + submitterOrg + ' organisation does not currently own application: ' + submitterOrg + applicationNumber);
        }

        await ctx.visaApplicationList.updateVisaApplication(visaApplication);
        return visaApplication;
    }

    /**
     * Marking History check failed for the Visa Application
     *
     * @param {Context} ctx the transaction context
     * @param {String} submitterOrg application submitter, VisaWorld
     * @param {Integer} applicationNumber application number
     * @param {String} approvingOrgMSP approving entity
     * @param {String} previousMSP the MSP of the org that performed last action on the visa application.
     * @param {String} approvingDateTime time application was approved
    */
        async historycheckfail(ctx, submitterOrg, applicationNumber, approvingOrgMSP, previousMSP, approvingDateTime) {

            console.log('>>>>>>>>>>>>>>>>> VisaAppContract::historycheckfail <<<<<<<<<<<<<<<<< applicationNumber: ', applicationNumber);

            let applicationKey = VisaApplication.makeKey([submitterOrg, applicationNumber]);

            let visaApplication = await ctx.visaApplicationList.getVisaApplication(applicationKey);

            //console.log('>>>>>>>>> vinit >>>>>>>> historycheck visaApplication fetched :', visaApplication);

            // Check application is not already in final decision i.e. approved/declined
            if (visaApplication.isApproved() || visaApplication.isDeclined()) {
                console.log('Decision is already given on Visa application ' + submitterOrg + applicationNumber + '. Final decision: ' + visaApplication.currentState);
                throw new Error('\nDecision is already given on Visa application ' + submitterOrg + applicationNumber + ' Final decision: ' + visaApplication.currentState);
            }

            // Check application is not already history check passed or failed
            if (visaApplication.isHistoryChkPassed() || visaApplication.isHistoryChkFailed()) {
                console.log('History check is already concluded for Visa application ' + submitterOrg + applicationNumber + '. Final decision: ' + visaApplication.currentState);
                throw new Error('\nHistory check is already concluded for Visa application ' + submitterOrg + applicationNumber + ' Final decision: ' + visaApplication.currentState);
            }

            // Check application is not in documents check failed state.
            if (visaApplication.isDocChkFailed()) {
                console.log('Documents check was failed for Visa application ' + submitterOrg + applicationNumber + ' Application cannot proceed. ');
                throw new Error('\nDocuments check was failed for Visa application ' + submitterOrg + applicationNumber + ' Application cannot proceed. ');
            }

            let mspid = ctx.clientIdentity.getMSPID(); //embassy
            //console.log('>>>>>>>>> vinit >>>>>>>> MSPid for approving org (police) :', mspid);

            // Validate approver's MSP matches the invoking entity MSP id - can only approve if you are the approving org. i.e. Police
            if (approvingOrgMSP !== mspid) {
                console.log('Application ' + submitterOrg + applicationNumber + ' cannot be approved by ' + ctx.clientIdentity.getMSPID() + ', as it is not the authorised owning Organisation');
                throw new Error('\nApplication ' + submitterOrg + applicationNumber + ' cannot be approved by ' + ctx.clientIdentity.getMSPID() + ', as it is not the authorised owning Organisation');
            }

            // Debug output to verify owner
            console.log('Current owner of application ' + submitterOrg + applicationNumber + ':', visaApplication.getOwner());

            //let dnName = ctx.clientIdentity.getOwner();

            // if the application submitter MSP matches the application owner MSP
            if (visaApplication.getOwnerMSP() === previousMSP) {
                console.log('Owner matches submitter. History clearence given for visa application: ', applicationNumber);
                //visaApplication.setOwner(dnName);
                visaApplication.setOwnerMSP(mspid); // setting embassy
                visaApplication.setHistoryChkFailed();
                visaApplication.approvingDateTime = approvingDateTime;
            } else {
                console.log('Submitter does not own the application:', previousMSP);
                throw new Error('\nowner: ' + submitterOrg + ' organisation does not currently own application: ' + submitterOrg + applicationNumber);
            }

            await ctx.visaApplicationList.updateVisaApplication(visaApplication);
            return visaApplication;
        }

    /**
     * Approve Visa Application
     *
     * @param {Context} ctx the transaction context
     * @param {String} submitterOrg application submitter, VisaWorld
     * @param {Integer} applicationNumber application number
     * @param {String} approvingOrgMSP approving entity
     * @param {String} previousMSP the MSP of the org that performed last action on the visa application.
     * @param {String} approvingDateTime time application was approved
    */
    async approve(ctx, submitterOrg, applicationNumber, approvingMSP, previousMSP, approvingDateTime) {

        console.log('>>>>>>>>>>>>>>>>> VisaAppContract::approve <<<<<<<<<<<<<<<<< applicationNumber: ', applicationNumber);

        let applicationKey = VisaApplication.makeKey([submitterOrg, applicationNumber]);

        let visaApplication = await ctx.visaApplicationList.getVisaApplication(applicationKey);

        //console.log('>>>>>>>>> vinit >>>>>>>> visaApplication fetched :', visaApplication);

        // Check application is not already in final decision i.e. approved/declined
        if (visaApplication.isApproved() || visaApplication.isDeclined()) {
            console.log('Decision is already given on Visa application ' + submitterOrg + applicationNumber + '. Final decision: ' + visaApplication.currentState);
            throw new Error('\nDecision is already given on Visa application ' + submitterOrg + applicationNumber + ' Final decision: ' + visaApplication.currentState);
        }

        // Check application is not in history check failed state.
        if (visaApplication.isHistoryChkFailed()) {
            console.log('Background history check was failed for Visa application ' + submitterOrg + applicationNumber + ' Application cannot proceed. ');
            throw new Error('\nBackground history check was failed for Visa application ' + submitterOrg + applicationNumber + ' Application cannot proceed. ');
        }

        // Check application is not in documents check failed state.
        if (visaApplication.isDocChkFailed()) {
            console.log('Documents check was failed for Visa application ' + submitterOrg + applicationNumber + ' Application cannot proceed. ');
            throw new Error('\nDocuments check was failed for Visa application ' + submitterOrg + applicationNumber + ' Application cannot proceed. ');
        }

        let mspid = ctx.clientIdentity.getMSPID(); //embassy
        //console.log('>>>>>>>>> vinit >>>>>>>> MSPid for approving org (embassy) :', mspid);

        // Validate approver's MSP matches the invoking entity MSP id - can only approve if you are the approving org. i.e. Embassy
        if (approvingMSP !== mspid) {
            console.log('Application ' + submitterOrg + applicationNumber + ' cannot be approved by ' + ctx.clientIdentity.getMSPID() + ', as it is not the authorised owning Organisation');
            throw new Error('\nApplication ' + submitterOrg + applicationNumber + ' cannot be approved by ' + ctx.clientIdentity.getMSPID() + ', as it is not the authorised owning Organisation');
        }

        // Debug output to verify owner
        console.log('Current owner of application ' + submitterOrg + applicationNumber + ':', visaApplication.getOwner());

        //let dnName = ctx.clientIdentity.getOwner();

        if(!visaApplication.isHistoryChkPassed()) {
            console.log('Background history check is pending for Visa application ' + submitterOrg + applicationNumber + ' Police org needs to confirm the transaction. ');
            throw new Error('\nBackground history check is still pending for Visa application ' + submitterOrg + applicationNumber + ' Police org needs to confirm the transaction. ');
        }

        // if the application submitter MSP matches the application owner MSP
        if (visaApplication.getOwnerMSP() === previousMSP) {
            console.log('Owner matches submitter. Approving visa application: ', applicationNumber);
            //visaApplication.setOwner(dnName);
            visaApplication.setOwnerMSP(mspid); // setting embassy
            visaApplication.setApproved();
            visaApplication.approvingDateTime = approvingDateTime; // record approval date
        } else {
            console.log('Submitter does not own the application:', previousMSP);
            throw new Error('\nowner: ' + submitterOrg + ' organisation does not currently own application: ' + submitterOrg + applicationNumber);
        }

        await ctx.visaApplicationList.updateVisaApplication(visaApplication);
        return visaApplication;
    }

    /**
     * Decline Visa Application
     *
     * @param {Context} ctx the transaction context
     * @param {String} submitterOrg application submitter, VisaWorld
     * @param {Integer} applicationNumber application number
     * @param {String} approvingOrgMSP approving entity
     * @param {String} previousMSP the MSP of the org that performed last action on the visa application.
     * @param {String} approvingDateTime time application was approved
    */
    async decline(ctx, submitterOrg, applicationNumber, approvingMSP, previousMSP, approvingDateTime) {

        console.log('>>>>>>>>>>>>>>>>> VisaAppContract::decline <<<<<<<<<<<<<<<<< applicationNumber: ', applicationNumber);

        let applicationKey = VisaApplication.makeKey([submitterOrg, applicationNumber]);

        let visaApplication = await ctx.visaApplicationList.getVisaApplication(applicationKey);

        //console.log('>>>>>>>>> vinit >>>>>>>> visaApplication fetched :', visaApplication);

        // Check application is not already in final decision i.e. approved/declined
        if (visaApplication.isApproved() || visaApplication.isDeclined()) {
            console.log('Decision is already given on Visa application ' + submitterOrg + applicationNumber + '. Final decision: ' + visaApplication.currentState);
            throw new Error('\nDecision is already given on Visa application ' + submitterOrg + applicationNumber + ' Final decision: ' + visaApplication.currentState);
        }

        let mspid = ctx.clientIdentity.getMSPID(); //embassy
        //console.log('>>>>>>>>> vinit >>>>>>>> MSPid for approving org (embassy) :', mspid);

        // Validate approver's MSP matches the invoking entity MSP id - can only approve if you are the approving org. i.e. Embassy
        if (approvingMSP !== mspid) {
            console.log('Application ' + submitterOrg + applicationNumber + ' cannot be declined by ' + ctx.clientIdentity.getMSPID() + ', as it is not the authorised owning Organisation');
            throw new Error('\nApplication ' + submitterOrg + applicationNumber + ' cannot be declined by ' + ctx.clientIdentity.getMSPID() + ', as it is not the authorised owning Organisation');
        }

        // Debug output to verify owner
        //console.log('Current owner of application ' + submitterOrg + applicationNumber + ':', visaApplication.getOwner());

        //let dnName = ctx.clientIdentity.getOwner();

        // if the application submitter MSP matches the application owner MSP
        if (visaApplication.getOwnerMSP() === previousMSP) {
            console.log('Declining visa application: ', applicationNumber);
            //visaApplication.setOwner(dnName);
            visaApplication.setOwnerMSP(mspid); // setting embassy
            visaApplication.setDeclined();
            visaApplication.approvingDateTime = approvingDateTime; // record decline date
        } else {
            console.log('Submitter does not own the application:', previousMSP);
            throw new Error('\nowner: ' + submitterOrg + ' organisation does not currently own application: ' + submitterOrg + applicationNumber);
        }

        await ctx.visaApplicationList.updateVisaApplication(visaApplication);
        return visaApplication;
    }


    // Query transactions

    /**
     * Query history of a visa application
     * @param {Context} ctx the transaction context
     * @param {String} submitter who has submitted the application (VisaWorld)
     * @param {Integer} applicationNumber application number
    */
    async queryHistory(ctx, submitter, applicationNumber) {

        // Get a key to be used for History query

        let query = new QueryUtils(ctx, 'org.visanet.visaapp');
        let results = await query.getAssetHistory(submitter, applicationNumber); // (ledgerKey);
        return results;

    }

    /**
    * queryOwner visa application: supply name of owning org, to find list of applications based on owner field
    * @param {Context} ctx the transaction context
    * @param {String} owner visa application owner
    */
    async queryOwner(ctx, owner) {

        let query = new QueryUtils(ctx, 'org.visanet.visaapp');
        let owner_results = await query.queryKeyByOwner(owner);

        return owner_results;
    }

    /**
    * queryPartial visa application - provide a prefix eg. "VisaWorld" will list all applications _submitted_ by VisaWorld agency
    * @param {Context} ctx the transaction context
    * @param {String} prefix asset class prefix (added to visaApplist namespace) eg. org.visanet.visaappVisaWorld asset listing: applications submitted by VisaWorld.
    */
    async queryPartial(ctx, prefix) {

        let query = new QueryUtils(ctx, 'org.visanet.visaapp');
        let partial_results = await query.queryKeyByPartial(prefix);

        return partial_results;
    }

    /**
    * queryAdHoc visa applications - supply a custom mongo query
    * eg - as supplied as a param:
    * ex1:  ["{\"selector\":{\"applicationNumber\":{\"$eq\":00001}}}"]
    * ex2:  ["{\"selector\":{\"submitter\":{\"$eq\":VisaWorld}}}"]
    *
    * @param {Context} ctx the transaction context
    * @param {String} queryString querystring
    */
    async queryAdhoc(ctx, queryString) {

        let query = new QueryUtils(ctx, 'org.visanet.visaapp');
        let querySelector = JSON.parse(queryString);
        let adhoc_results = await query.queryByAdhoc(querySelector);

        return adhoc_results;
    }


    /**
     * queryNamed - supply named query - 'case' statement chooses selector to build
     * @param {Context} ctx the transaction context
     * @param {String} queryname the 'named' query (built here) - or - the adHoc query string, provided as a parameter
     */
    async queryNamed(ctx, queryname) {
        let querySelector = {};
        switch (queryname) {
            case "approved":
                querySelector = { "selector": { "currentState": 6 } };  // 6 = approved state
                break;
            case "declined":
                querySelector = { "selector": { "currentState": 7 } };  // 7 = declined state
                break;
            case "new":
                querySelector = { "selector": { "currentState": 1 } };
                break;
            case "docschkpassed":
                querySelector = { "selector": { "currentState": 2 } };
                break;
            case "docschkfailed":
                querySelector = { "selector": { "currentState": 3 } };
                break;
            case "historychkpassed":
                querySelector = { "selector": { "currentState": 4 } };
                break;
            case "historychkfailed":
                querySelector = { "selector": { "currentState": 5 } };
                break;
            default: // else, unknown named query
                throw new Error('invalid named query supplied: ' + queryname + '- please try again ');
        }

        let query = new QueryUtils(ctx, 'org.visanet.visaapp');
        let adhoc_results = await query.queryByAdhoc(querySelector);

        return adhoc_results;
    }

}

module.exports = VisaApplicationContract;
