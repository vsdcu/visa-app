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

### Troubleshooting tips
Sometimes following error pops-up while starting or restarting the visanet network. This seems related to the cleanup of existing resources/environment.

Unfortunately, I don't know the exact reason of this intermittent failure as of now. However, executing the `start-visanet-network.sh` script again seems resolving this issue.
Rarely, you might need to run the script a couple of times. 

```
2024-05-01 21:36:32.614 IST 0004 INFO [common.tools.configtxgen.localconfig] Load -> Loaded configuration: /Users/vinit/go/src/visa-app/test-network/configtx/configtx.yaml
2024-05-01 21:36:32.615 IST 0005 PANI [common.tools.configtxgen] func1 -> proto: Marshal called with nil
panic: proto: Marshal called with nil [recovered]
	panic: proto: Marshal called with nil

goroutine 1 [running]:
go.uber.org/zap/zapcore.(*CheckedEntry).Write(0xc00010c300, {0x0, 0x0, 0x0})
	/home/runner/work/fabric/fabric/vendor/go.uber.org/zap/zapcore/entry.go:234 +0x49b
go.uber.org/zap.(*SugaredLogger).log(0xc00000e218, 0x4, {0xc0001dcec0?, 0x111f512?}, {0x0?, 0xc0001dcea0?, 0xc000155790?}, {0x0, 0x0, 0x0})
	/home/runner/work/fabric/fabric/vendor/go.uber.org/zap/sugar.go:234 +0x13b
go.uber.org/zap.(*SugaredLogger).Panicf(...)
	/home/runner/work/fabric/fabric/vendor/go.uber.org/zap/sugar.go:159
github.com/hyperledger/fabric/common/flogging.(*FabricLogger).Panic(0xc00000e220?, {0xc0000b7818?, 0x162403a?, 0x16?})
	/home/runner/work/fabric/fabric/common/flogging/zap.go:73 +0x5d
main.main.func1()
	/home/runner/work/fabric/fabric/cmd/configtxgen/main.go:261 +0x1cc
panic({0x1556320, 0xc00018a390})
	/opt/hostedtoolcache/go/1.18.10/x64/src/runtime/panic.go:838 +0x207
github.com/hyperledger/fabric/protoutil.MarshalOrPanic(...)
	/home/runner/work/fabric/fabric/protoutil/commonutils.go:26
github.com/hyperledger/fabric/internal/configtxgen/encoder.addValue(0xc000188640, {0x16f9860, 0xc00014fd60}, {0x1618e46, 0x6})
	/home/runner/work/fabric/fabric/internal/configtxgen/encoder/encoder.go:59 +0x14c
github.com/hyperledger/fabric/internal/configtxgen/encoder.NewConsortiumOrgGroup(0xc0001d59e0)
	/home/runner/work/fabric/fabric/internal/configtxgen/encoder/encoder.go:246 +0x19b
github.com/hyperledger/fabric/internal/configtxgen/encoder.NewConsortiumGroup(0xc00000dfe0)
	/home/runner/work/fabric/fabric/internal/configtxgen/encoder/encoder.go:373 +0x111
github.com/hyperledger/fabric/internal/configtxgen/encoder.NewConsortiumsGroup(0x1563700?)
	/home/runner/work/fabric/fabric/internal/configtxgen/encoder/encoder.go:355 +0x170
github.com/hyperledger/fabric/internal/configtxgen/encoder.NewChannelGroup(0xc0000a1bc0)
	/home/runner/work/fabric/fabric/internal/configtxgen/encoder/encoder.go:168 +0x5e5
github.com/hyperledger/fabric/internal/configtxgen/encoder.NewBootstrapper(0x16?)
	/home/runner/work/fabric/fabric/internal/configtxgen/encoder/encoder.go:595 +0xa5
main.doOutputBlock(0xc0000a1bc0, {0x2060b03d6, 0xe}, {0x2060b03f2, 0x24})
	/home/runner/work/fabric/fabric/cmd/configtxgen/main.go:35 +0x45
main.main()
	/home/runner/work/fabric/fabric/cmd/configtxgen/main.go:296 +0x9b2
+ res=2
Failed to generate orderer genesis block...

```


