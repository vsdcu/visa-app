[//]: # (SPDX-License-Identifier: CC-BY-4.0)

# Hyperledger Fabric Visa App

## Mission Statement:
Our mission is to develop VisaChain, a cutting-edge blockchain-based visa processing system, to streamline the visa application process, enhance security and privacy, and ensure compliance with regulatory requirements. By providing a trusted platform for collaboration among stakeholders, VisaChain aims to simplify visa processing, promote tourism and business travel, and facilitate cross-border mobility in a rapidly evolving global landscape.

## Test Network

The Visa application uses an underlying test network based on the [Fabric test network](test-network) in the Hyperledger Fabric's samples repository, which provides a Docker Compose-based test network. For reference, see the [test network tutorial](https://hyperledger-fabric.readthedocs.io/en/latest/test_network.html).

The existing network test network with two Organization peers and an ordering service node has been extended to include one more organization, Org3. This network now consists of 3 Orgs representing 3 main entities involved in a typical visa processing use case: Embassy, Police, and Visa Agency (Visaworld).

Bash scripts have been provided for ease of operations:
1. To bring up the basic 2 org network with 2 peers, 2 CAs, 2 CouchDBs, 1 orderer, and a channel:
    > `start-visanet-network.sh`
2. To add another org in the existing network and set up required steps:
    > `add-org3.sh`
3. To run the lifecycle steps required for the chaincode to Package, Install, Approve, and Commit to Fabric:
    > `deploy-chaincode.sh`
4. To print the chaincode and network logs to console:
    > `monitor-logs.sh`

## Usage

### Bringing Up the Network - 3 Orgs

1. Clone the repository visa app.
2. Navigate to the cloned repository: `cd /Users/vinit/go/src/visa-app`.
3. Setting up the initial test network with 2 orgs:
    > `./start-visanet-network.sh`
4. Add 3rd org into the existing network:
    > `./add-org3.sh`
5. Enable monitoring logging in a separate shell:
    > `./monitor-logs.sh`
6. Enable the Block explorer in a separate bash shell:
    ```
    cd /Users/vinit/go/src/visa-app/organization/visaworld
    source visaworld.sh
    cd /Users/vinit/go/src/visa-app/organization/visaworld/application
    npm install
    node addToWallet.js
    node blockListener.js
    ```

### Deploying the Visa Chaincode in Network - (Package, Install, Approve, and Commit)

1. Run chaincode lifecycle steps:
    > `./deploy-chaincode.sh`

### Running the Application - Client Interactions

#### By org VisaWorld - on behalf of their customers
1. Initiating a new application (run in a new bash shell):
    ```
    cd /Users/vinit/go/src/visa-app/organization/visaworld
    source visaworld.sh
    cd /Users/vinit/go/src/visa-app/organization/visaworld/application
    node addToWallet.js
    node visaApplication.js
    ```

#### By org Police - to verify the new applications
2. Initiating a background and history check and updating the visa application (run in a new bash shell):
    ```
    cd /Users/vinit/go/src/visa-app/organization/police
    source police.sh
    cd /Users/vinit/go/src/visa-app/organization/police/application
    node npm install
    node addToWallet.js
    node visaClearencePass.js
    ```

#### By org Embassy - to approve the applications having history clearance by Police org
3. Initiating a transaction to approve and updating the visa application (run in a new bash shell):
    ```
    cd /Users/vinit/go/src/visa-app/organization/embassy
    source embassy.sh
    cd /Users/vinit/go/src/visa-app/organization/embassy/application
    node npm install
    node addToWallet.js
    node visaApprove.js
    ```

#### (Optional) Checking world state by querying the ledger any time
4. Query fabric to verify the application state at any time:
    ```
    cd /Users/vinit/go/src/visa-app/organization/visaworld
    source visaworld.sh
    cd /Users/vinit/go/src/visa-app/organization/visaworld/application
    node addToWallet.js
    node query-transaction-history.js
    ```

### Shutting Down the Network
```
cd /Users/vinit/go/src/visa-app
./stop-visanet-network.sh
```
