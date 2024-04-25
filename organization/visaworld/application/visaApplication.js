/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
*/

/*
 * This application has 6 basic steps:
 * 1. Select an identity from a wallet
 * 2. Connect to network gateway
 * 3. Access Visanet network
 * 4. Construct request to submit a Visa application
 * 5. Submit transaction
 * 6. Process response
 */

'use strict';

// Bring key classes into scope, most importantly Fabric SDK network class
const fs = require('fs');
const yaml = require('js-yaml');
const { Wallets, Gateway } = require('fabric-network');
const VisaApp = require('../contract/lib/visaapp.js');

// Main program function
async function main() {

    // A wallet stores a collection of identities for use
    const wallet = await Wallets.newFileSystemWallet('../identity/user/markAgent/wallet');

    // A gateway defines the peers used to access Fabric networks
    const gateway = new Gateway();

    // Main try/catch block
    try {

        // Specify userName for network access
        // const userName = 'markAgent.issuer@magnetocorp.com';
        const userName = 'markAgent';

        // Load connection profile; will be used to locate a gateway
        let connectionProfile = yaml.safeLoad(fs.readFileSync('../gateway/connection-org2.yaml', 'utf8'));

        // Set connection options; identity and wallet
        let connectionOptions = {
            identity: userName,
            wallet: wallet,
            discovery: { enabled:true, asLocalhost: true }
        };

        // Connect to gateway using application specified parameters
        console.log('Connect to Fabric gateway.');

        await gateway.connect(connectionProfile, connectionOptions);

        // Access VisaNet network
        console.log('Use network channel: visachannel.');

        const network = await gateway.getNetwork('visachannel');

        // Get addressability to commercial paper contract
        console.log('Use org.visanet.visaapp smart contract.');

        const contract = await network.getContract('visaappcontract');

        // submit visa application
        console.log('Submit visa application transaction.');

        const appSubmitResponse = await contract.submitTransaction('appsubmit', 'VisaWorld', '00001', '2024-05-01');

        // process response
        console.log('Process application submission transaction response.'+appSubmitResponse);

        let visaapp = VisaApp.fromBuffer(appSubmitResponse);

        console.log(`${visaapp.submitter} : Visa application : ${visaapp.applicationNumber} successfully submitted`);
        console.log('Transaction complete.');

    } catch (error) {

        console.log(`Error processing transaction. ${error}`);
        console.log(error.stack);

    } finally {

        // Disconnect from the gateway
        console.log('Disconnect from Fabric gateway.');
        gateway.disconnect();

    }
}
main().then(() => {

    console.log('Issue program complete.');

}).catch((e) => {

    console.log('Issue program exception.');
    console.log(e);
    console.log(e.stack);
    process.exit(-1);

});
