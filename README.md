[//]: # (SPDX-License-Identifier: CC-BY-4.0)

## Hyperledger Fabric Visa App

# Mission Statement:"
Our mission is to develop VisaChain, a cutting-edge blockchain-based visa processing system, to streamline the visa application process, enhance security and privacy, and ensure compliance with regulatory requirements. By providing a trusted platform for collaboration among stakeholders, VisaChain aims to simplify visa processing, promote tourism and business travel, and facilitate cross-border mobility in a rapidly evolving global landscape."

In this demo application, We will have a minimum of 3 orgs representing 3 different parties interested in performing this use-case.

1. Embassy/Consulate/Immigration department: Allowing a legal process for a foreign national to visit the country. (Visa - law), Verifying the documentations with the embassy to make the visa decision. 
2. Police: Background checks, Criminal history check, Verification etc.
3. VISA application agencies: Submitting the applications on behalf of travellers seeking permission to visit.

## Test network

Visa-application uses underline test network which is based on the [Fabric test network](test-network) in the Hyperledger Fabric's samples repository provides a Docker Compose based test network. For reference, [test network tutorial](https://hyperledger-fabric.readthedocs.io/en/latest/test_network.html). 

The existing network test network with two Organization peers and an ordering service node has been extended to include one more organization Org3. 
This network now consist of 3 Orgs which represents 3 main entities involved in a typical visa processing usecase. 
1. Embassy
2. Police
3. Visa Agency (Visaworld here onwards) 

Further, a few bash scripts have also been written for the ease of operations as below -
1. network-starter.sh - To bring up the basic 2 org network with 2 peers, 2 CAs, 2 couchDBs, 1 orderer and a channel 
2. setup-org3.sh - To add another org in the existing network and setting up required steps.
3. my-deploy-script.sh - To run the lifecycle steps required for the chaincode to Package, Install, Approve and Commit to Fabric.
4. monitor-logs.sh - To print the chaincode and network logs to console.

## Need to add details about application here

## License <a name="license"></a>

## commands to bring up the network - 3 Orgs.

1. clone the repository visa app - 
2. cd /Users/vinit/go/src/visa-app
3. Setting up the initial test network with 2 orgs
    > ./network-starter.sh
4. Add 3rd org into the existing network
    > ./setup-org3.sh
5. Enable the monitoring logging in a separate shell
    > ./monitor-logs.sh
6. Enable the Block explorer in a separate bash shell     
    > cd /Users/vinit/go/src/visa-app/organization/visaworld
    > source visaworld.sh
    > cd /Users/vinit/go/src/visa-app/organization/visaworld/application
    > npm install
    > node addToWallet.js
    > node blockListener.js

## commands to deploy the visa chaincode in network - (Package, Install, Approve and Commit)

1. Run chaincode lifecycle steps 
    > ./deploy-chaincode.sh 

## commands to run the application - client interactions

# By org VisaWorld - on behalf of their customers
1. Initiating a new application. (run in a new bash shell)
    > cd /Users/vinit/go/src/visa-app/organization/visaworld
    > source visaworld.sh
    > cd /Users/vinit/go/src/visa-app/organization/visaworld/application
    > node addToWallet.js
    > node visaApplication.js

# By org Police - to verify the new applications
2. Initiating a background and history check and updating the visa application. (run in a new bash shell)
    > cd /Users/vinit/go/src/visa-app/organization/police
    > source police.sh
    > cd /Users/vinit/go/src/visa-app/organization/police/application
    > node npm install
    > node addToWallet.js
    > node visaClearencePass.js   

# By org Embassy - to approve the applications having history clearence by Police org
3. Initiating a transaction to approve and updating the visa application. (run in a new bash shell)
    > cd /Users/vinit/go/src/visa-app/organization/embassy
    > source embassy.sh
    > cd /Users/vinit/go/src/visa-app/organization/embassy/application
    > node npm install
    > node addToWallet.js
    > node visaApprove.js         

# (Optional) Checking world state by querying the ledger
4. Query fabric to verify the application state at any time.
    > cd /Users/vinit/go/src/visa-app/organization/visaworld
    > source visaworld.sh
    > cd /Users/vinit/go/src/visa-app/organization/visaworld/application
    > node addToWallet.js
    > node queryapp.js

## commands to shut down the network
    > cd /Users/vinit/go/src/visa-app
    > ./network-clean.sh
