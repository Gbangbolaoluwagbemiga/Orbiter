import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const CONTRACT_ADDRESS = "0xe32e98b057C80554Ba449ae00eC1d57865A58ACc";
  const payeer = await ethers.getContractAt("Payeer", CONTRACT_ADDRESS);
  const count = await payeer.sessionCount();
  console.log("\n📊 WhoPays Activity Check:");
  console.log(`Total Sessions: ${count.toString()}`);
  const [signer] = await ethers.getSigners();
  const bal = await ethers.provider.getBalance(signer.address);
  console.log(`Master Balance: ${ethers.formatEther(bal)} CELO`);
}
main().catch(console.error);
