import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://forno.celo.org");
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("Deploying Payeer contract...");

  const Payeer = new ethers.ContractFactory(
    [
      "function createSession(address[] memory _participants, uint256 _amount, address _merchant) external returns (uint256)",
      "function selectPayer(uint256 _sessionId) external",
      "function completePayment(uint256 _sessionId) external payable",
      "function sessions(uint256) external view returns (address[] memory participants, uint256 amount, address merchant, address selectedPayer, bool completed, uint256 createdAt)",
      "function sessionCount() external view returns (uint256)",
    ],
    `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Payeer {
    struct Session {
        address[] participants;
        uint256 amount;
        address merchant;
        address selectedPayer;
        bool completed;
        uint256 createdAt;
    }

    mapping(uint256 => Session) public sessions;
    uint256 public sessionCount;

    event SessionCreated(uint256 indexed sessionId, address[] participants, uint256 amount);
    event PayerSelected(uint256 indexed sessionId, address indexed payer);
    event PaymentCompleted(uint256 indexed sessionId, address indexed payer, uint256 amount);

    function createSession(address[] memory _participants, uint256 _amount, address _merchant) external returns (uint256) {
        require(_participants.length > 1, "At least 2 participants required");
        
        uint256 sessionId = sessionCount++;
        Session storage session = sessions[sessionId];
        session.participants = _participants;
        session.amount = _amount;
        session.merchant = _merchant;
        session.createdAt = block.timestamp;
        
        emit SessionCreated(sessionId, _participants, _amount);
        return sessionId;
    }

    function selectPayer(uint256 _sessionId) external {
        Session storage session = sessions[_sessionId];
        require(!session.completed, "Session already completed");
        require(session.selectedPayer == address(0), "Payer already selected");

        // Simple pseudo-randomness for demonstration
        // In a production app, use Chainlink VRF or similar
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, session.participants))) % session.participants.length;
        
        session.selectedPayer = session.participants[randomIndex];
        emit PayerSelected(_sessionId, session.selectedPayer);
    }

    function completePayment(uint256 _sessionId) external payable {
        Session storage session = sessions[_sessionId];
        require(session.selectedPayer != address(0), "Payer not selected yet");
        require(!session.completed, "Payment already completed");
        require(msg.sender == session.selectedPayer, "Only the selected payer can pay");
        require(msg.value >= session.amount, "Insufficient payment");

        session.completed = true;
        
        (bool success, ) = payable(session.merchant).call{value: msg.value}("");
        require(success, "Transfer to merchant failed");

        emit PaymentCompleted(_sessionId, msg.sender, msg.value);
    }
}`,
    signer,
  );

  const payeer = await Payeer.deploy();
  await payeer.waitForDeployment();

  const address = await payeer.getAddress();
  console.log("Payeer deployed to:", address);

  return address;
}

main()
  .then((address) => {
    console.log("Deployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
