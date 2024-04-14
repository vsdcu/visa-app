[//]: # (SPDX-License-Identifier: CC-BY-4.0)

# Hyperledger Fabric Visa App

## Test network

The [Fabric test network](test-network) in the samples repository provides a Docker Compose based test network with two
Organization peers and an ordering service node. You can use it on your local machine to run the samples listed below.
You can also use it to deploy and test your own Fabric chaincodes and applications. To get started, see
the [test network tutorial](https://hyperledger-fabric.readthedocs.io/en/latest/test_network.html).

## Need to add details about application here

## License <a name="license"></a>

Hyperledger Project source code files are made available under the Apache
License, Version 2.0 (Apache-2.0), located in the [LICENSE](LICENSE) file.
Hyperledger Project documentation files are made available under the Creative
Commons Attribution 4.0 International License (CC-BY-4.0), available at http://creativecommons.org/licenses/by/4.0/.


## commands to bring up the network - 3 Orgs

cd ~/go/src/visa-app/
./network-starter.sh

cd test-network/addOrg3
./addOrg3.sh up -ca -s couchdb

## stop commands
cd ~/go/src/visa-app/
./network-clean.sh

