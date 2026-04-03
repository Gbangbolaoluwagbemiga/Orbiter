import hre from "hardhat";
import fs from "fs";

async function main() {
  console.log("🚀 Deploying Payeer contracts to Celo...");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`📝 Deploying with account: ${deployer.address}`);

  // Deploy Payeer
  console.log("\n1️⃣  Deploying Payeer contract...");
  const Payeer = await hre.ethers.getContractFactory("Payeer");
  const payeer = await Payeer.deploy();
  const payeerDeployed = await payeer.waitForDeployment();
  const payeerAddress = await payeerDeployed.getAddress();
  console.log(`✅ Payeer deployed to: ${payeerAddress}`);

  // Deploy PayerBadge
  console.log("\n2️⃣  Deploying PayerBadge contract...");
  const PayerBadge = await hre.ethers.getContractFactory("PayerBadge");
  const badge = await PayerBadge.deploy();
  const badgeDeployed = await badge.waitForDeployment();
  const badgeAddress = await badgeDeployed.getAddress();
  console.log(`✅ PayerBadge deployed to: ${badgeAddress}`);

  // Save addresses
  const addresses = {
    network: "celo",
    chainId: 42220,
    payeer: payeerAddress,
    payerBadge: badgeAddress,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
  };

  const addressesPath = "deployment-addresses.json";
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));

  console.log("\n✨ Deployment Summary:");
  console.log("========================");
  console.log(`Payeer:     ${payeerAddress}`);
  console.log(`PayerBadge: ${badgeAddress}`);
  console.log(`Deployer:   ${deployer.address}`);
  console.log(`Network:    Celo Mainnet (42220)`);
  console.log(`\n💾 Addresses saved to: ${addressesPath}`);

  return addresses;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
