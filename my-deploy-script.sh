#!/bin/bash

# Running in VisaWorld org:

echo "Step 1: Navigating to VisaWorld directory..."
cd /Users/vinit/go/src/visa-app/organization/visaworld

echo "Step 2: Sourcing the visaworld.sh script..."
source visaworld.sh

echo "Step 3: Packaging the chaincode on peer..."
peer lifecycle chaincode package cp.tar.gz --lang node --path ./contract --label cp_0

echo "Step 4: Installing the chaincode on peer..."
peer lifecycle chaincode install cp.tar.gz

echo "Step 5: Fetching the chaincode ID..."
export PACKAGE_ID=$(peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[0].package_id')
echo "Chaincode ID: $PACKAGE_ID"

echo "Step 6: Approving the chaincode..."
peer lifecycle chaincode approveformyorg  --orderer localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
                                          --channelID mychannel  \
                                          --name visaappcontract  \
                                          -v 0  \
                                          --package-id $PACKAGE_ID \
                                          --sequence 1  \
                                          --tls  \
                                          --cafile "$ORDERER_CA"

echo "Step 7: Checking readiness..."
peer lifecycle chaincode checkcommitreadiness --channelID mychannel --name visaappcontract -v 0 --sequence 1

# Running in Embassy org:

echo "Step 8: Navigating to Embassy directory..."
cd /Users/vinit/go/src/visa-app/organization/embassy

echo "Step 9: Sourcing the embassy.sh script..."
source embassy.sh

echo "Step 10: Packaging the chaincode on peer..."
peer lifecycle chaincode package cp.tar.gz --lang node --path ./contract --label cp_0

echo "Step 11: Installing the chaincode on peer..."
peer lifecycle chaincode install cp.tar.gz

echo "Step 12: Fetching the chaincode ID..."
export PACKAGE_ID=$(peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[0].package_id')
echo "Chaincode ID: $PACKAGE_ID"

echo "Step 13: Approving the chaincode..."
peer lifecycle chaincode approveformyorg  --orderer localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
                                          --channelID mychannel  \
                                          --name visaappcontract  \
                                          -v 0  \
                                          --package-id $PACKAGE_ID \
                                          --sequence 1  \
                                          --tls  \
                                          --cafile "$ORDERER_CA"

echo "Step 14: Checking readiness..."
peer lifecycle chaincode checkcommitreadiness --channelID mychannel --name visaappcontract -v 0 --sequence 1

echo "Step 15: Committing to fabric as Embassy..."
peer lifecycle chaincode commit -o localhost:7050 \
                                --peerAddresses localhost:7051 --tlsRootCertFiles "${PEER0_ORG1_CA}" \
                                --peerAddresses localhost:9051 --tlsRootCertFiles "${PEER0_ORG2_CA}" \
                                --ordererTLSHostnameOverride orderer.example.com \
                                --channelID mychannel --name visaappcontract -v 0 \
                                --sequence 1 \
                                --tls --cafile "$ORDERER_CA" --waitForEvent

echo "Step 16: Invoking chaincode..."
peer chaincode invoke -o localhost:7050  --ordererTLSHostnameOverride orderer.example.com \
                                --peerAddresses localhost:7051 --tlsRootCertFiles "${PEER0_ORG1_CA}" \
                                --peerAddresses localhost:9051 --tlsRootCertFiles "${PEER0_ORG2_CA}" \
                                --channelID mychannel --name visaappcontract \
                                -c '{"Args":["org.visanet.visaapp:instantiate"]}' ${PEER_ADDRESS_ORG1} ${PEER_ADDRESS_ORG2} \
                                --tls --cafile "$ORDERER_CA" --waitForEvent

echo "Step 17: Printing chaincode metadata..."
peer chaincode query -o localhost:7050  --ordererTLSHostnameOverride orderer.example.com \
                                        --channelID mychannel \
                                        --name visaappcontract \
                                        -c '{"Args":["org.hyperledger.fabric:GetMetadata"]}' \
                                        --peerAddresses localhost:9051 --tlsRootCertFiles "${PEER0_ORG2_CA}" \
                                        --tls --cafile "$ORDERER_CA" | jq '.' -C

echo "Step 18: Starting logs monitoring thread..."
cd /Users/vinit/go/src/visa-app/organization/visaworld/configuration/cli
./monitordocker.sh fabric_test


