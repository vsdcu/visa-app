/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
*/

'use strict';

// Utility class for ledger state
const State = require('../ledger-api/state.js');

// Enumerate visa application state values
const visaState = {
    NEW: 1,
    DOCS_CHK_PASS: 2,
    DOCS_CHK_FAIL: 3,
    HISTORY_CHK_PASS: 4,
    HISTORY_CHK_FAIL: 5,
    APPROVED: 6,
    DECLINED: 7
};

/**
 * VisaApp class extends State class
 * Class will be used by application and smart contract to define a visa application
 */
class VisaApp extends State {

    constructor(obj) {
        super(VisaApp.getClass(), [obj.submitter, obj.applicationNumber]);
        Object.assign(this, obj);
    }

    /**
     * Basic getters and setters
    */
    getSubmitter() {
        return this.submitter;
    }

    setSubmitter(newSubmitter) {
        this.submitter = newSubmitter;
    }

    getOwner() {
        return this.owner;
    }

    setOwnerMSP(mspid) {
        this.mspid = mspid;
    }

    getOwnerMSP() {
        return this.mspid;
    }

    setOwner(newOwner) {
        this.owner = newOwner;
    }

    /**
     * Useful methods to encapsulate visa application states
     */
    setNew() {
        this.currentState = visaState.NEW;
    }

    setDocsChkPassed() {
        this.currentState = visaState.DOCS_CHK_PASS;
    }

    setDocsChkFailed() {
        this.currentState = visaState.DOCS_CHK_FAIL;
    }

    setHistoryChkPassed() {
        this.currentState = visaState.HISTORY_CHK_PASS;
    }

    setHistoryChkFailed() {
        this.currentState = visaState.HISTORY_CHK_FAIL;
    }

    setApproved() {
        this.currentState = visaState.APPROVED;
    }

    setDeclined() {
        this.currentState = visaState.DECLINED;
    }

    isNew() {
        return this.currentState === visaState.NEW;
    }

    isDocChkPassed() {
        return this.currentState === visaState.DOCS_CHK_PASS;
    }

    isDocChkFailed() {
        return this.currentState === visaState.DOCS_CHK_FAIL;
    }

    isHistoryChkPassed() {
        return this.currentState === visaState.HISTORY_CHK_PASS;
    }

    isHistoryChkFailed() {
        return this.currentState === visaState.HISTORY_CHK_FAIL;
    }

    isApproved() {
        return this.currentState === visaState.APPROVED;
    }

    isDeclined() {
        return this.currentState === visaState.DECLINED;
    }

    static fromBuffer(buffer) {
        return VisaApp.deserialize(buffer);
    }

    toBuffer() {
        return Buffer.from(JSON.stringify(this));
    }

    /**
     * Deserialize a state data to visa application
     * @param {Buffer} data to form back into the object
     */
    static deserialize(data) {
        return State.deserializeClass(data, VisaApp);
    }

    /**
     * Factory method to create a visa application object
     */
    static createInstance(submitter, applicationNumber, submissionDateTime) {
        return new VisaApp({ submitter, applicationNumber, submissionDateTime });
    }

    static getClass() {
        return 'org.visanet.visaapp';
    }

    /**
 * Utility function to get the string representation of visa application state
 * @param {number} stateInt - Integer value representing the visa application state
 * @returns {string} - String representation of the visa application state
 */
    static getStateString(stateInt) {
        switch (stateInt) {
            case visaState.NEW:
                return 'NEW';
            case visaState.DOCS_CHK_PASS:
                return 'DOCS_CHK_PASS';
            case visaState.DOCS_CHK_FAIL:
                return 'DOCS_CHK_FAIL';
            case visaState.HISTORY_CHK_PASS:
                return 'HISTORY_CHK_PASS';
            case visaState.HISTORY_CHK_FAIL:
                return 'HISTORY_CHK_FAIL';
            case visaState.APPROVED:
                return 'APPROVED';
            case visaState.DECLINED:
                return 'DECLINED';
            default:
                return 'UNKNOWN';
        }
    }
}

module.exports = VisaApp;
