import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Stress test host:", signer.address);

  // Derive a secondary wallet from the same mnemonic if possible, or just random
  const wallet2 = ethers.Wallet.createRandom().connect(ethers.provider);
  console.log("Generated secondary wallet:", wallet2.address);
  
  console.log("Funding secondary wallet...");
  const fundTx = await signer.sendTransaction({
    to: wallet2.address,
    value: ethers.parseEther("0.2") // Fund enough for gas and many joins
  });
  await fundTx.wait();
  console.log("Wallet funded.");

  const PAYEER_ADDRESS = "0xe32e98b057C80554Ba449ae00eC1d57865A58ACc";
  const PayeerHost = await ethers.getContractAt("Payeer", PAYEER_ADDRESS, signer);
  const PayeerGuest = await ethers.getContractAt("Payeer", PAYEER_ADDRESS, wallet2);

  const AMOUNT_PER_TX = ethers.parseEther("0.000001");
  const TOTAL_SESSIONS = 1000;
  let successCount = 0;

  console.log(`Starting stress test for ${TOTAL_SESSIONS} loops...`);

  // Initialize nonces to prevent "nonce too low" errors
  let hostNonce = await ethers.provider.getTransactionCount(signer.address);
  let guestNonce = await ethers.provider.getTransactionCount(wallet2.address);

  for (let i = 0; i < TOTAL_SESSIONS; i++) {
    try {
      // 1. Create Lobby
      const createTx = await PayeerHost.createLobby(AMOUNT_PER_TX, signer.address, { nonce: hostNonce++ });
      const receipt = await createTx.wait();
      
      const event = receipt.logs.find(l => {
        try { 
          const log = PayeerHost.interface.parseLog(l);
          return log && log.name === 'SessionCreated'; 
        } catch { return false; }
      });
      
      if (!event) {
        console.log(`Loop ${i+1}: SessionCreated event not found`);
        continue;
      }

      const parsedLog = PayeerHost.interface.parseLog(event);
      const sessionId = parsedLog.args[0];
      
      // Small delay to ensure the node has indexed the new session
      await new Promise(r => setTimeout(r, 1000));

      // 2. Join Session
      const joinTx = await PayeerGuest.joinSession(sessionId, { nonce: guestNonce++ });
      await joinTx.wait();
      
      // 3. Lock and Select Payer
      const spinTx = await PayeerHost.lockAndSelectPayer(sessionId, { nonce: hostNonce++ });
      await spinTx.wait();
      
      successCount++;
      if (successCount % 5 === 0) {
        console.log(`Completed ${successCount}/${TOTAL_SESSIONS} successful full cycles`);
      } else {
        process.stdout.write(".");
      }
      
    } catch (e) {
      console.error(`\nError on loop ${i+1}: ${e.message.slice(0, 150)}...`);
      // Resync nonces from the network on error
      hostNonce = await ethers.provider.getTransactionCount(signer.address);
      guestNonce = await ethers.provider.getTransactionCount(wallet2.address);
      // Wait longer on error to let the network stabilize
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  
  console.log(`\nFinal result: ${successCount}/${TOTAL_SESSIONS} cycles completed.`);
}

main().catch(console.error);
