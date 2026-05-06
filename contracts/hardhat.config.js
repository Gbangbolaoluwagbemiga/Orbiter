import "@nomicfoundation/hardhat-toolbox";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Auto-load .env from project root (parent of contracts/) ──────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv() {
  try {
    const envPath = resolve(__dirname, "../.env");
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // No .env found — rely on shell environment variables
  }
}

loadEnv();

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    alfajores: {
      url: "https://alfajores-forno.celo-testnet.org",
      accounts: process.env.PRIVATE_KEY
        ? [`0x${process.env.PRIVATE_KEY.replace(/^0x/, "")}`]
        : [],
      timeout: 120000,
    },
    celo: {
      url: process.env.CELO_RPC_URL || "https://forno.celo.org",
      accounts: process.env.PRIVATE_KEY
        ? [`0x${process.env.PRIVATE_KEY.replace(/^0x/, "")}`]
        : [],
      timeout: 120000,
      gasPrice: "auto",
    },
  },
};
