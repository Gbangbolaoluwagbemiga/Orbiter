import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PayeerModule = buildModule("PayeerModule", (m) => {
  const payeer = m.contract("Payeer");

  return { payeer };
});

export default PayeerModule;
