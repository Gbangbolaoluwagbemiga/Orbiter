import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PayerBadgeModule = buildModule("PayerBadgeModule", (m) => {
  const payerBadge = m.contract("PayerBadge");

  return { payerBadge };
});

export default PayerBadgeModule;
