/**
 * WhoPays DAU Booster — On-chain Transaction Volume & DAU Builder
 *
 * Maximises Daily Active Users (unique wallets interacting with the contract)
 * and transaction volume within a strict 2 CELO spending cap.
 *
 * Strategy:
 *   - Funds 8 child wallets (0.15 CELO each = 1.2 CELO)
 *   - Runs 50 cycles across 4 parallel workers (~50×3 = 150 txs)
 *   - Each cycle: create lobby (host) → join (unique child) → lock (host)
 *   - Hard-stops if total spend approaches 2 CELO
 *
 * Usage:
 *   cd contracts
 *   npx hardhat run scripts/stressTest.js --network celo
 */

import pkg from "hardhat";
import fs from "fs";

const { ethers } = pkg;

// ── Config ─────────────────────────────────────────────────────────────────────
const PAYEER_ADDRESS   = "0x5fA80497E70506E3CB8a2e32b838782aF31E005A";
const MAX_SPEND_WEI    = ethers.parseEther("2.0");       // Hard cap: 2 CELO
const CHILD_COUNT      = 8;                               // Unique wallets = DAU
const TOPUP_PER_CHILD  = ethers.parseEther("0.15");      // 0.15 CELO per child
const MIN_CHILD_BAL    = ethers.parseEther("0.05");
const TOTAL_CYCLES     = Number(process.env.STRESS_CYCLES    || "50");
const PARALLEL_WORKERS = Number(process.env.STRESS_PARALLEL  || "4");
const AMOUNT_PER_LOBBY = ethers.parseEther("0.000001");

// ── Load private key ──────────────────────────────────────────────────────────
async function loadPrivateKey() {
  let pk = process.env.PRIVATE_KEY;
  if (pk) return pk.replace(/^0x/, "");
  for (const p of ["../.env", ".env"]) {
    if (!fs.existsSync(p)) continue;
    const line = fs.readFileSync(p, "utf8").split("\n")
      .find(l => l.startsWith("PRIVATE_KEY="));
    if (line) {
      pk = line.split("=")[1]?.trim().replace(/^['"]|['"]$/g, "");
      if (pk) return pk.replace(/^0x/, "");
    }
  }
  throw new Error("PRIVATE_KEY not found");
}

// ── Derive child wallets ───────────────────────────────────────────────────────
function deriveChildren(rootPk, provider, count) {
  return Array.from({ length: count }, (_, i) => {
    const seed = ethers.toUtf8Bytes(`whopays-dau:0x${rootPk}:${i}`);
    return new ethers.Wallet(ethers.keccak256(seed), provider);
  });
}

// ── Fee overrides ─────────────────────────────────────────────────────────────
async function feeOpts(provider, nonce) {
  const f = await provider.getFeeData();
  return {
    nonce,
    maxFeePerGas: f.maxFeePerGas
      ? (f.maxFeePerGas * 115n) / 100n   // +15% tip buffer
      : ethers.parseUnits("350", "gwei"),
    maxPriorityFeePerGas: f.maxPriorityFeePerGas || ethers.parseUnits("2", "gwei"),
  };
}

// ── Nonce-tracked tx sender with retry ────────────────────────────────────────
async function sendTx({ contract, wallet, fn, args, nonceMap }) {
  const key = wallet.address.toLowerCase();
  const provider = wallet.provider;
  if (!nonceMap.has(key)) {
    nonceMap.set(key, await provider.getTransactionCount(wallet.address, "pending"));
  }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const n = nonceMap.get(key);
      const opts = await feeOpts(provider, n);
      const tx = await contract.connect(wallet)[fn](...args, opts);
      nonceMap.set(key, n + 1);
      return await tx.wait(1);
    } catch (err) {
      const msg = String(err?.message || "").toLowerCase();
      const retry = msg.includes("timeout") || msg.includes("nonce too low") ||
        msg.includes("already known") || msg.includes("too many requests");
      if (!retry || attempt === 3) throw err;
      nonceMap.set(key, await provider.getTransactionCount(wallet.address, "pending"));
      await new Promise(r => setTimeout(r, 2500 * attempt));
    }
  }
}

// ── Parse SessionCreated event ────────────────────────────────────────────────
function parseSessionId(contract, receipt) {
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === "SessionCreated") return parsed.args[0];
    } catch {}
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const pk = await loadPrivateKey();
  const provider = ethers.provider;
  const host = new ethers.Wallet(`0x${pk}`, provider);
  const payeer = await ethers.getContractAt("Payeer", PAYEER_ADDRESS, host);

  const startBalance = await provider.getBalance(host.address);
  const budgetCeiling = startBalance - MAX_SPEND_WEI; // Stop if balance drops below this

  console.log("\n🚀 WhoPays DAU Booster");
  console.log("═".repeat(54));
  console.log("📍 Host wallet :", host.address);
  console.log("💰 Balance     :", ethers.formatEther(startBalance), "CELO");
  console.log("🛑 Budget cap  : 2.0 CELO max spend");
  console.log("👥 Child wallets:", CHILD_COUNT, "(unique DAU contributors)");
  console.log("🎯 Target      :", TOTAL_CYCLES, "cycles =", TOTAL_CYCLES * 3, "txs");
  console.log("⚙️  Workers     :", PARALLEL_WORKERS, "parallel");
  console.log("📋 Contract    :", PAYEER_ADDRESS);
  console.log("═".repeat(54));

  // ── Fund child wallets ──────────────────────────────────────────────────────
  const children = deriveChildren(pk, provider, CHILD_COUNT);
  console.log("\n💸 Funding child wallets for DAU...");

  let hostNonce = await provider.getTransactionCount(host.address, "pending");
  let totalSpent = 0n;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const bal = await provider.getBalance(child.address);

    if (bal >= MIN_CHILD_BAL) {
      console.log(`  ✅ Child ${i} already funded: ${ethers.formatEther(bal)} CELO`);
      continue;
    }

    const needed = TOPUP_PER_CHILD - bal;
    const currentBal = await provider.getBalance(host.address);
    if (currentBal - needed <= budgetCeiling) {
      console.log(`  ⚠️  Skipping child ${i} — would exceed 2 CELO budget`);
      continue;
    }

    try {
      const opts = await feeOpts(provider, hostNonce++);
      const tx = await host.sendTransaction({ to: child.address, value: needed, gasLimit: 21000, ...opts });
      await tx.wait(1);
      totalSpent += needed;
      console.log(`  💳 Child ${i} (${child.address.slice(0, 10)}...) → +${ethers.formatEther(needed)} CELO`);
    } catch (err) {
      console.log(`  ⚠️  Failed to fund child ${i}: ${String(err.message).slice(0, 60)}`);
    }
  }

  // ── Check funded children ───────────────────────────────────────────────────
  const active = [];
  for (const child of children) {
    const bal = await provider.getBalance(child.address);
    if (bal >= MIN_CHILD_BAL) active.push(child);
  }

  if (active.length === 0) {
    throw new Error("No funded child wallets available. Check CELO balance.");
  }

  console.log(`\n✅ ${active.length} unique child wallets active (each = 1 DAU)`);
  console.log("▶️  Starting stress cycles...\n");

  // ── Stress cycles ───────────────────────────────────────────────────────────
  let successTx = 0;
  let errorCount = 0;
  let cyclesDone = 0;
  const nonceMap = new Map();
  let nextCycle = 0;

  async function runWorker(wid) {
    while (true) {
      const cycle = nextCycle++;
      if (cycle >= TOTAL_CYCLES) return;

      // Hard budget check
      const curBal = await provider.getBalance(host.address);
      if (curBal <= budgetCeiling) {
        console.log(`\n🛑 Worker ${wid}: budget ceiling hit — stopping`);
        return;
      }

      try {
        // Rotate through child wallets for maximum unique DAU
        const joiner = active[cycle % active.length];

        // 1. Create lobby (host)
        const createReceipt = await sendTx({
          contract: payeer, wallet: host,
          fn: "createLobby",
          args: [AMOUNT_PER_LOBBY, host.address],
          nonceMap,
        });
        successTx++;

        const sessionId = parseSessionId(payeer, createReceipt);
        if (sessionId === null) throw new Error("SessionCreated event not found");

        // 2. Join session (child wallet — unique DAU)
        await sendTx({
          contract: payeer, wallet: joiner,
          fn: "joinSession",
          args: [sessionId],
          nonceMap,
        });
        successTx++;

        // 3. Lock & select payer (host)
        await sendTx({
          contract: payeer, wallet: host,
          fn: "lockAndSelectPayer",
          args: [sessionId],
          nonceMap,
        });
        successTx++;
        cyclesDone++;

        const pct = Math.round((cyclesDone / TOTAL_CYCLES) * 100);
        process.stdout.write(
          `\r⚡ ${cyclesDone}/${TOTAL_CYCLES} cycles (${pct}%) | ✅ ${successTx} tx | ❌ ${errorCount} err | Workers: ${PARALLEL_WORKERS}`
        );
      } catch (err) {
        errorCount++;
        const short = String(err?.message || err).slice(0, 100);
        console.error(`\n❌ Worker ${wid} cycle ${cycle + 1}: ${short}`);

        if (String(err?.message || "").toLowerCase().includes("insufficient funds")) {
          console.log("🛑 Insufficient funds — stopping worker");
          return;
        }
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }

  const t0 = Date.now();
  await Promise.all(Array.from({ length: PARALLEL_WORKERS }, (_, i) => runWorker(i + 1)));
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const finalBalance = await provider.getBalance(host.address);
  const spent = startBalance - finalBalance;

  console.log("\n\n" + "═".repeat(54));
  console.log("🏁 DAU Boost Complete!");
  console.log("═".repeat(54));
  console.log(`📍 Contract       : ${PAYEER_ADDRESS}`);
  console.log(`👥 Unique wallets : ${active.length + 1} (${active.length} children + host)`);
  console.log(`🎯 Cycles done    : ${cyclesDone}/${TOTAL_CYCLES}`);
  console.log(`✅ Successful txs : ${successTx}`);
  console.log(`❌ Failed txs     : ${errorCount}`);
  console.log(`📈 Success rate   : ${((successTx / Math.max(successTx + errorCount, 1)) * 100).toFixed(1)}%`);
  console.log(`💸 Total spent    : ${ethers.formatEther(spent)} CELO`);
  console.log(`💰 Remaining      : ${ethers.formatEther(finalBalance)} CELO`);
  console.log(`⏱️  Duration       : ${elapsed}s`);
  console.log("═".repeat(54));
  console.log(`🔍 CeloScan: https://celoscan.io/address/${host.address}`);
  console.log("═".repeat(54) + "\n");
}

main().catch(err => {
  console.error("\n❌ Fatal:", err.message);
  process.exitCode = 1;
});
