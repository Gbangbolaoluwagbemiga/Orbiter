const hre = require("hardhat");

async function main() {
  console.log("Deploying Payeer contracts to local network...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);

  // Deploy Payeer contract
  const Payeer = await hre.ethers.getContractFactory("Payeer");
  const payeer = await Payeer.deploy();
  await payeer.deployed();
  console.log(`Payeer deployed to: ${payeer.address}`);

  // Deploy PayerBadge contract
  const PayerBadge = await hre.ethers.getContractFactory("PayerBadge");
  const badge = await PayerBadge.deploy();
  await badge.deployed();
  console.log(`PayerBadge deployed to: ${badge.address}`);

  // Save addresses to file
  const addresses = {
    payeer: payeer.address,
    badge: badge.address,
    deployer: deployer.address,
    network: "local",
    timestamp: new Date().toISOString(),
  };

  const fs = require("fs");
  fs.writeFileSync(
    "deployment-addresses.json",
    JSON.stringify(addresses, null, 2),
  );

  console.log("\nDeployment complete!");
  console.log(JSON.stringify(addresses, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
