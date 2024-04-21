#!/bin/bash

# Set up org3
echo "Setting up org3..."
cd /Users/vinit/go/src/visa-app/test-network/addOrg3 || exit
echo "Navigated to addOrg3 directory."

# Generate cryptographic material for org3
echo "Generating cryptographic material for org3..."
./addOrg3.sh generate
echo "Cryptographic material for org3 generated successfully."

# Start org3 and join channel
echo "Starting org3 and joining channel..."
./addOrg3.sh up -c mychannel -s couchdb -ca
echo "Org3 started and joined channel successfully."

# Copy connection-org3.yaml into police gateway directory
echo "Copying connection-org3.yaml into police gateway directory..."
cp /Users/vinit/go/src/visa-app/test-network/organizations/peerOrganizations/org3.example.com/connection-org3.yaml /Users/vinit/go/src/visa-app/organization/police/gateway
echo "connection-org3.yaml copied to police gateway directory."

echo "Org3 setup completed successfully."

