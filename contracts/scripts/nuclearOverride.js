import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const [masterSigner] = await ethers.getSigners();
  console.log("🚀 Initializing Nuclear Override V3 (Optimized Funds)...");
  console.log("Master Wallet:", masterSigner.address);

  const feeData = await ethers.provider.getFeeData();
  const AGGRESSIVE_GAS_PRICE = ethers.parseUnits("100", "gwei");

  const TARGET_DAU = 20;
  const TOTAL_TRANSACTIONS = 1000;
  const CONTRACT_ADDRESS = "0xe32e98b057C80554Ba449ae00eC1d57865A58ACc"; 
  
  const wallets = [];
  let masterNonce = await ethers.provider.getTransactionCount(masterSigner.address);

  for (let i = 0; i < TARGET_DAU; i++) {
    const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
    wallets.push(wallet);
    try {
        const fundTx = await masterSigner.sendTransaction({
          to: wallet.address,
          value: ethers.parseEther("0.5"), 
          gasPrice: AGGRESSIVE_GAS_PRICE,
          gasLimit: 30000,
          nonce: masterNonce++
        });
        console.log(`[${i+1}/${TARGET_DAU}] Funded ${wallet.address}`);
        if ((i + 1) % 5 === 0) await fundTx.wait();
    } catch (err) {
      console.error(`Failed to fund wallet ${i+1}:`, err.message.slice(0, 50));
      masterNonce = await ethers.provider.getTransactionCount(masterSigner.address);
    }
  }

  const payeer = await ethers.getContractAt("Payeer", CONTRACT_ADDRESS);
  let successCount = 0;
  for (let i = 0; i < TOTAL_TRANSACTIONS; i++) {
    const walletIndex = i % TARGET_DAU;
    const currentWallet = wallets[walletIndex];
    const contractWithSigner = payeer.connect(currentWallet);
    try {
      const amount = ethers.parseEther("0.000001");
      const tx = await contractWithSigner.createLobby(amount, masterSigner.address, { 
            gasPrice: AGGRESSIVE_GAS_PRICE,
            gasLimit: 300000 
      });
      if (i % 20 === 0) { await tx.wait(); console.log(`Transaction ${i+1}/${TOTAL_TRANSACTIONS} confirmed`); }
      else { process.stdout.write("."); }
      successCount++;
    } catch (error) {
      console.error(`\n❌ Error on transaction ${i+1}:`, error.message.slice(0, 80));
    }
  }
  console.log(`\n\n✅ Volume Generation Complete! Total: ${successCount}`);
}
main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
