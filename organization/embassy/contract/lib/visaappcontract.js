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
     * Buy commercial paper
     *
      * @param {Context} ctx the transaction context
      * @param {String} issuer commercial paper issuer
      * @param {Integer} paperNumber paper number for this issuer
      * @param {String} currentOwner current owner of paper
      * @param {String} newOwner new owner of paper
      * @param {Integer} price price paid for this paper // transaction input - not written to asset
      * @param {String} purchaseDateTime time paper was purchased (i.e. traded)  // transaction input - not written to asset
     */
    async buy(ctx, issuer, paperNumber, currentOwner, newOwner, price, purchaseDateTime) {

        // Retrieve the current paper using key fields provided
        let paperKey = CommercialPaper.makeKey([issuer, paperNumber]);
        let paper = await ctx.paperList.getPaper(paperKey);

        // Validate current owner
        if (paper.getOwner() !== currentOwner) {
            throw new Error('\nPaper ' + issuer + paperNumber + ' is not owned by ' + currentOwner);
        }

        // First buy moves state from ISSUED to TRADING (when running )
        if (paper.isIssued()) {
            paper.setTrading();
        }

        // Check paper is not already REDEEMED
        if (paper.isTrading()) {
            paper.setOwner(newOwner);
            // save the owner's MSP 
            let mspid = ctx.clientIdentity.getMSPID();
            paper.setOwnerMSP(mspid);
        } else {
            throw new Error('\nPaper ' + issuer + paperNumber + ' is not trading. Current state = ' + paper.getCurrentState());
        }

        // Update the paper
        await ctx.paperList.updatePaper(paper);
        return paper;
    }

    /**
      *  Buy request:  (2-phase confirmation: Commercial paper is 'PENDING' subject to completion of transfer by owning org)
      *  Alternative to 'buy' transaction
      *  Note: 'buy_request' puts paper in 'PENDING' state - subject to transfer confirmation [below].
      * 
      * @param {Context} ctx the transaction context
      * @param {String} issuer commercial paper issuer
      * @param {Integer} paperNumber paper number for this issuer
      * @param {String} currentOwner current owner of paper
      * @param {String} newOwner new owner of paper                              // transaction input - not written to asset per se - but written to block
      * @param {Integer} price price paid for this paper                         // transaction input - not written to asset per se - but written to block
      * @param {String} purchaseDateTime time paper was requested                // transaction input - ditto.
     */
    async buy_request(ctx, issuer, paperNumber, currentOwner, newOwner, price, purchaseDateTime) {
        

        // Retrieve the current paper using key fields provided
        let paperKey = CommercialPaper.makeKey([issuer, paperNumber]);
        let paper = await ctx.paperList.getPaper(paperKey);

        // Validate current owner - this is really information for the user trying the sample, rather than any 'authorisation' check per se FYI
        if (paper.getOwner() !== currentOwner) {
            throw new Error('\nPaper ' + issuer + paperNumber + ' is not owned by ' + currentOwner + ' provided as a paraneter');
        }
        // paper set to 'PENDING' - can only be transferred (confirmed) by identity from owning org (MSP check).
        paper.setPending();

        // Update the paper
        await ctx.paperList.updatePaper(paper);
        return paper;
    }

    /**
     * transfer commercial paper: only the owning org has authority to execute. It is the complement to the 'buy_request' transaction. '[]' is optional below.
     * eg. issue -> buy_request -> transfer -> [buy ...n | [buy_request...n | transfer ...n] ] -> redeem
     * this transaction 'pair' is an alternative to the straight issue -> buy -> [buy....n] -> redeem ...path
     *
     * @param {Context} ctx the transaction context
     * @param {String} issuer commercial paper issuer
     * @param {Integer} paperNumber paper number for this issuer
     * @param {String} newOwner new owner of paper
     * @param {String} newOwnerMSP  MSP id of the transferee
     * @param {String} confirmDateTime  confirmed transfer date.
    */
    async transfer(ctx, issuer, paperNumber, newOwner, newOwnerMSP, confirmDateTime) {

        // Retrieve the current paper using key fields provided
        let paperKey = CommercialPaper.makeKey([issuer, paperNumber]);
        let paper = await ctx.paperList.getPaper(paperKey);

        // Validate current owner's MSP in the paper === invoking transferor's MSP id - can only transfer if you are the owning org.

        if (paper.getOwnerMSP() !== ctx.clientIdentity.getMSPID()) {
            throw new Error('\nPaper ' + issuer + paperNumber + ' is not owned by the current invoking Organisation, and not authorised to transfer');
        }

        // Paper needs to be 'pending' - which means you need to have run 'buy_pending' transaction first.
        if ( ! paper.isPending()) {
            throw new Error('\nPaper ' + issuer + paperNumber + ' is not currently in state: PENDING for transfer to occur: \n must run buy_request transaction first');
        }
        // else all good

        paper.setOwner(newOwner);
        // set the MSP of the transferee (so that, that org may also pass MSP check, if subsequently transferred/sold on)
        paper.setOwnerMSP(newOwnerMSP);
        paper.setTrading();
        paper.confirmDateTime = confirmDateTime;

        // Update the paper
        await ctx.paperList.updatePaper(paper);
        return paper;
    }

    /**
     * Approve Visa Application
     *
     * @param {Context} ctx the transaction context
     * @param {String} submitterOrg application submitter, VisaWorld
     * @param {Integer} applicationNumber application number
     * @param {String} approvingOrgMSP approving entity
     * @param {String} applicationSubmitterMSP the MSP of the org that the paper will be redeemed with.
     * @param {String} approvingDateTime time application was approved
    */
    async approve(ctx, submitterOrg, applicationNumber, approvingOrgMSP, applicationSubmitterMSP, approvingDateTime) {

        console.log('>>>>>>>>> vinit >>>>>>>> Inside approve() :', submitterOrg);

        let applicationKey = VisaApplication.makeKey([submitterOrg, applicationNumber]);
    
        let visaApplication = await ctx.visaApplicationList.getVisaApplication(applicationKey);
    
        console.log('>>>>>>>>> vinit >>>>>>>> visaApplication fetched :', visaApplication);
   
        // Check application is not already in final decision i.e. approved/declined
        if (visaApplication.isApproved() || visaApplication.isDeclined()) {
            console.log('Decision is already given on Visa application ' + submitterOrg + applicationNumber + '. Final decision: ' + visaApplication.currentState);
            throw new Error('\nDecision is already given on Visa application ' + submitterOrg + applicationNumber + ' Final decision: ' + visaApplication.currentState);
        }

        let mspid = ctx.clientIdentity.getMSPID(); //embassy
        console.log('>>>>>>>>> vinit >>>>>>>> MSPid for approving org (embassy) :', mspid);

        // Validate approver's MSP matches the invoking entity MSP id - can only approve if you are the approving org. i.e. Embassy
        if (approvingOrgMSP !== mspid) {
            console.log('Application ' + submitterOrg + applicationNumber + ' cannot be approved by ' + ctx.clientIdentity.getMSPID() + ', as it is not the authorised owning Organisation');
            throw new Error('\nApplication ' + submitterOrg + applicationNumber + ' cannot be approved by ' + ctx.clientIdentity.getMSPID() + ', as it is not the authorised owning Organisation');
        }
    
        // Debug output to verify owner
        console.log('Current owner of application ' + submitterOrg + applicationNumber + ':', visaApplication.getOwner());
    
        let dnName = ctx.clientIdentity.getAttributeValue("DN");

        // if the application submitter MSP matches the application owner MSP
        if (visaApplication.getOwnerMSP() === applicationSubmitterMSP) {
            console.log('Owner matches submitter. Approving application... getAttributeValue("DN"):: ', dnName);
            visaApplication.setOwner(dnName); 
            visaApplication.setOwnerMSP(mspid); // setting embassy
            visaApplication.setApproved();
            visaApplication.approvingDateTime = approvingDateTime; // record redemption date against the asset (the complement to 'issue date')
        } else {
            console.log('Submitter does not own the application:', applicationSubmitterMSP);
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
