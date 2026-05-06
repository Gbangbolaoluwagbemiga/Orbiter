/**
 * WhoPaysAgent ERC-8004 Deployment Script (ES Module)
 *
 * Deploys the WhoPaysAgent contract on Celo Mainnet,
 * registers it with the ERC-8004 ecosystem, and logs
 * the agent identity for verification on 8004scan.io
 *
 * Usage:
 *   cd contracts
 *   npx hardhat run scripts/deployAgent.js --network celo
 */

import hre from "hardhat";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Agent Card JSON (upload to Pinata after deploy) ───────────────────────────
const AGENT_CARD = {
  name: "WhoPays PayBot",
  version: "1.0.0",
  type: "payment-agent",
  description:
    "WhoPays AI Agent - autonomously manages group bill sessions on Celo MiniPay. Analyzes on-chain payment history, recommends fair payer selection, and supports auto-settlement for opted-in users.",
  capabilities: [
    "analyze-payment-history",
    "recommend-payer",
    "get-session-details",
    "check-badge-status",
    "auto-settle-payment",
  ],
  endpoints: {
    a2a: "https://whopays.vercel.app/api/agent",
    health: "https://whopays.vercel.app/api/agent",
  },
  chain: "celo",
  chainId: 42220,
  contractAddress: "REPLACE_AFTER_DEPLOY",
  erc8004Compliant: true,
  trustModel: "self-agent-id",
  selfAgentId: "REPLACE_AFTER_SELF_VERIFICATION",
  supportedAssets: ["CELO", "cUSD", "cEUR"],
  relatedContracts: {
    payeer: "0x5fA80497E70506E3CB8a2e32b838782aF31E005A",
    payerBadge: "0x956D4eeF22377d83D5cc31E0951a4591F08aECEC",
  },
};

async function main() {
  console.log("\n🤖 Deploying WhoPays PayBot Agent (ERC-8004)...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deployer address:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "CELO");

  if (balance < hre.ethers.parseEther("0.01")) {
    throw new Error("❌ Insufficient CELO balance! Need at least 0.01 CELO.");
  }

  // ── Deploy WhoPaysAgent ───────────────────────────────────────────────────
  console.log("\n⏳ Deploying WhoPaysAgent contract...");

  const WhoPaysAgent = await hre.ethers.getContractFactory("WhoPaysAgent");

  // Agent wallet = deployer for simplicity; use a separate EOA in production
  const agentWallet = deployer.address;
  console.log("🔑 Agent wallet (EOA):", agentWallet);

  const whoPaysAgent = await WhoPaysAgent.deploy(agentWallet);
  await whoPaysAgent.waitForDeployment();

  const agentAddress = await whoPaysAgent.getAddress();
  console.log("\n✅ WhoPaysAgent deployed at:", agentAddress);

  // ── Save Agent Card JSON with real contract address ───────────────────────
  const updatedCard = { ...AGENT_CARD, contractAddress: agentAddress };
  const agentCardPath = path.join(__dirname, "../agent-card.json");
  fs.writeFileSync(agentCardPath, JSON.stringify(updatedCard, null, 2));
  console.log("📄 Agent Card saved to:", agentCardPath);
  console.log("   → Upload this file to Pinata: https://pinata.cloud");

  // ── Register agent on-chain with placeholder URI ──────────────────────────
  console.log("\n⏳ Registering agent identity on-chain...");
  const placeholderURI = `ipfs://QmPlaceholder_WhoPaysPayBot_${agentAddress.slice(2, 10)}`;

  const registerTx = await whoPaysAgent.registerAgent(placeholderURI);
  await registerTx.wait();
  console.log("✅ Agent registered. URI:", placeholderURI);
  console.log("📡 TX:", registerTx.hash);

  // ── Log first agent action (proves agent executes onchain txs) ────────────
  console.log("\n⏳ Logging first agent action (onchain proof of agentic tx)...");
  const actionTx = await whoPaysAgent.logAgentAction(0, "initial-deployment");
  await actionTx.wait();
  console.log("✅ Agent action logged:", actionTx.hash);

  // ── Save deployment addresses ─────────────────────────────────────────────
  const deploymentInfo = {
    network: "celo",
    chainId: 42220,
    whoPaysAgent: agentAddress,
    agentWallet,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    registrationTx: registerTx.hash,
    firstActionTx: actionTx.hash,
    erc8004Compliant: true,
    nextSteps: [
      "1. Upload agent-card.json to Pinata → get IPFS CID",
      "2. Call updateAgentCard('ipfs://YOUR_CID') on the deployed contract",
      "3. Register at 8004scan.io: https://8004scan.io",
      "4. Complete Self Protocol verification: https://self.xyz",
      "5. Call recordSelfVerification('YOUR_SELF_AGENT_ID') on the contract",
    ],
  };

  const addressesPath = path.join(__dirname, "../deployment-addresses.json");
  let existing = {};
  try {
    const raw = fs.readFileSync(addressesPath, "utf8");
    existing = JSON.parse(raw);
  } catch {
    // File doesn't exist yet — fine
  }

  fs.writeFileSync(
    addressesPath,
    JSON.stringify({ ...existing, ...deploymentInfo }, null, 2)
  );
  console.log("💾 Deployment info saved to deployment-addresses.json");

  // ── Final summary ─────────────────────────────────────────────────────────
  const sep = "=".repeat(60);
  console.log(`\n${sep}`);
  console.log("🎉 WhoPays PayBot Agent Successfully Deployed!");
  console.log(sep);
  console.log("📍 Contract  :", agentAddress);
  console.log("🔑 Agent EOA :", agentWallet);
  console.log("📡 Network   : Celo Mainnet (chainId: 42220)");
  console.log("🏷️  Standard  : ERC-8004");
  console.log(sep);
  console.log("\n📋 NEXT STEPS:");
  deploymentInfo.nextSteps.forEach((s) => console.log("  " + s));
  console.log(`\n🔍 CeloScan  : https://celoscan.io/address/${agentAddress}`);
  console.log("🤖 8004scan  : https://8004scan.io");
  console.log(`${sep}\n`);
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exitCode = 1;
});
