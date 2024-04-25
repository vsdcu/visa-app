/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
*/

/*
 * This application has 6 basic steps:
 * 1. Select an identity from a wallet
 * 2. Connect to network gateway
 * 3. Access visanet network
 * 4. Construct request to approve visa application
 * 5. Submit transaction
 * 6. Process response
 */

'use strict';

// Bring key classes into scope, most importantly Fabric SDK network class
const fs = require('fs');
const yaml = require('js-yaml');
const { Wallets, Gateway } = require('fabric-network');
const visaapp = require('../contract/lib/visaapp.js');


// Main program function
async function main() {

  // A wallet stores a collection of identities for use
  const wallet = await Wallets.newFileSystemWallet('../identity/user/robertOfficer/wallet');


  // A gateway defines the peers used to access Fabric networks
  const gateway = new Gateway();

  // Main try/catch block
  try {

    // Specify userName for network access
        // Specify userName for network access
        const userName = 'robertOfficer';

    // Load connection profile; will be used to locate a gateway
    let connectionProfile = yaml.safeLoad(fs.readFileSync('../gateway/connection-org1.yaml', 'utf8'));

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
    console.log('Use network channel: mychannel.');

    const network = await gateway.getNetwork('mychannel');

    // Get addressability to visa application contract
    console.log('Use org.visanet.visaapp smart contract.');

    const contract = await network.getContract('visaappcontract', 'org.visanet.visaapp');

    // approved visa application
    console.log('Submit visa application approved transaction.');

    // previousMSP should be Org3MSP (Police) before application reach the approval stage.
    // this check make sure police org had the last ownership of this appliocation.
    const approvedResponse = await contract.submitTransaction('approve', 'VisaWorld', '00001', 'Org1MSP', 'Org3MSP', '2024-05-01'); // async approve(ctx, submitterOrg, applicationNumber, approvingMSP, previousMSP, approvingDateTime)

    // process response
    console.log('Process approved transaction response.');

    let visa = visaapp.fromBuffer(approvedResponse);

    console.log(`${visa.submitter} visa application : ${visa.applicationNumber} successfully approveded by ${visa.owner}`);

    console.log('Transaction complete.');

  } catch (error) {

    console.log(`Error processing transaction. ${error}`);
    console.log(error.stack);

  } finally {

    // Disconnect from the gateway
    console.log('Disconnect from Fabric gateway.')
    gateway.disconnect();

  }
}
main().then(() => {

  console.log('approved program complete.');

}).catch((e) => {

  console.log('approved program exception.');
  console.log(e);
  console.log(e.stack);
  process.exit(-1);

});
