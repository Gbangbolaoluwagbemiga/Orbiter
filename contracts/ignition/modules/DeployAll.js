import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DeployAllModule = buildModule("DeployAllModule", (m) => {
  const payerBadge = m.contract("PayerBadge");
  const payeer = m.contract("Payeer");

  // Transfer ownership of PayerBadge to Payeer so Payeer can mint/update
  m.call(payerBadge, "transferOwnership", [payeer]);

  // Set the PayerBadge address in Payeer
  m.call(payeer, "setPayerBadgeContract", [payerBadge]);

  return { payerBadge, payeer };
});

export default DeployAllModule;
