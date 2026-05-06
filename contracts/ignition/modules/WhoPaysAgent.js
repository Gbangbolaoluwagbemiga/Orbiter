const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("WhoPaysAgentModule", (m) => {
  // The agent wallet EOA — this is the address PayBot uses to sign transactions
  // IMPORTANT: Replace this with your dedicated agent wallet address before deploying!
  const agentWallet = m.getParameter(
    "agentWallet",
    "0x3Be7fbBDbC73Fc4731D60EF09c4BA1A94DC58E41" // deployer address as default
  );

  const whoPaysAgent = m.contract("WhoPaysAgent", [agentWallet]);

  return { whoPaysAgent };
});
