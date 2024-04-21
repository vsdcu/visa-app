/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
*/

'use strict';

// Utility class for collections of ledger states --  a state list
const StateList = require('../ledger-api/statelist.js');

const VisaApp = require('./visaapp.js');

class VisaAppList extends StateList {

    constructor(ctx) {
        super(ctx, 'org.visanet.visaapp');
        this.use(VisaApp);
    }

    async addVisaApplication(visaApp) {
        return this.addState(visaApp);
    }

    async getVisaApplication(visaAppKey) {
        return this.getState(visaAppKey);
    }

    async updateVisaApplication(visaApp) {
        return this.updateState(visaApp);
    }
}


module.exports = VisaAppList;
