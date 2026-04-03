// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

interface IPayerBadge {
    function mintBadge(address to) external returns (uint256);
    function updateBadge(address user, uint256 amount) external;
    function userBadges(address user) external view returns (uint256);
}

contract Payeer is VRFConsumerBaseV2 {
    VRFCoordinatorV2Interface COORDINATOR;

    // Celo Alfajores VRF configuration
    address vrfCoordinator = 0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D; // Alfajores
    bytes32 keyHash = 0x79d3d8832d904592c0bf9818b621522c988bb8b0c7cdc3b56d0f97c5b1e3c464;
    uint64 s_subscriptionId = 1234; // Replace with your subscription ID
    uint32 callbackGasLimit = 100000;
    uint16 requestConfirmations = 3;
    uint32 numWords = 1;

    struct Session {
        address[] participants;
        uint256 amount;
        address merchant;
        address selectedPayer;
        bool completed;
        bool isLocked;
        uint256 createdAt;
        uint256 requestId; // For VRF
    }

    mapping(uint256 => Session) public sessions;
    mapping(uint256 => uint256) public requestIdToSessionId;
    uint256 public sessionCount;

    IPayerBadge public payerBadgeContract;

    event SessionCreated(uint256 indexed sessionId, address[] participants, uint256 amount);
    event ParticipantJoined(uint256 indexed sessionId, address participant);
    event SessionLocked(uint256 indexed sessionId);
    event PayerSelected(uint256 indexed sessionId, address indexed payer);
    event PaymentCompleted(uint256 indexed sessionId, address indexed payer, uint256 amount);
    event RandomnessRequested(uint256 indexed requestId, uint256 indexed sessionId);

    constructor() VRFConsumerBaseV2(vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
    }

    function setPayerBadgeContract(address _payerBadge) external {
        // Simple setter for demo purposes. In production, protect with onlyOwner
        payerBadgeContract = IPayerBadge(_payerBadge);
    }

    // LEGACY function to not break existing tests entirely
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

    // MULTIPLAYER LOBBY: Create a session and join automatically
    function createLobby(uint256 _amount, address _merchant) external returns (uint256) {
        uint256 sessionId = sessionCount++;
        Session storage session = sessions[sessionId];
        session.amount = _amount;
        session.merchant = _merchant;
        session.createdAt = block.timestamp;
        session.participants.push(msg.sender); // Host joins automatically
        
        emit SessionCreated(sessionId, session.participants, _amount);
        return sessionId;
    }

    // MULTIPLAYER LOBBY: Join an existing session
    function joinSession(uint256 _sessionId) external {
        Session storage session = sessions[_sessionId];
        require(!session.isLocked, "Session is already spinning/locked");
        require(!session.completed, "Session already completed");
        require(session.createdAt > 0, "Session does not exist");
        
        // check if already joined
        for (uint i = 0; i < session.participants.length; i++) {
            require(session.participants[i] != msg.sender, "Already joined");
        }
        
        session.participants.push(msg.sender);
        emit ParticipantJoined(_sessionId, msg.sender);
    }

    // MULTIPLAYER LOBBY: Lock and start spinning
    // This uses pseudo-randomness (block.timestamp, block.prevrandao, msg.sender) for fast UX.
    // For truly verifiable randomness in production, the 'selectPayer' VRF function should be used by the frontend.
    function lockAndSelectPayer(uint256 _sessionId) external {
        Session storage session = sessions[_sessionId];
        require(!session.completed, "Session already completed");
        require(!session.isLocked, "Session already locked");
        require(session.selectedPayer == address(0), "Payer already selected");
        require(session.participants.length > 1, "Not enough participants");

        session.isLocked = true;
        emit SessionLocked(_sessionId);

        uint256 randomIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))) % session.participants.length;
        session.selectedPayer = session.participants[randomIndex];
        emit PayerSelected(_sessionId, session.selectedPayer);
    }

    // VRF VERSION (Slow but secure, for future integration/production-grade verifiable randomness)
    function selectPayer(uint256 _sessionId) external {
        Session storage session = sessions[_sessionId];
        require(!session.completed, "Session already completed");
        require(session.selectedPayer == address(0), "Payer already selected");
        session.isLocked = true;

        // Request randomness from Chainlink VRF
        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );

        session.requestId = requestId;
        requestIdToSessionId[requestId] = _sessionId;

        emit RandomnessRequested(requestId, _sessionId);
    }

    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        uint256 sessionId = requestIdToSessionId[_requestId];
        Session storage session = sessions[sessionId];
        
        require(session.selectedPayer == address(0), "Payer already selected");
        
        uint256 randomIndex = _randomWords[0] % session.participants.length;
        session.selectedPayer = session.participants[randomIndex];
        
        emit PayerSelected(sessionId, session.selectedPayer);
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

        // NFT BADGE INTEGRATION: Mint or update badge
        if (address(payerBadgeContract) != address(0)) {
            uint256 existingTokenId = payerBadgeContract.userBadges(msg.sender);
            if (existingTokenId == 0) {
                payerBadgeContract.mintBadge(msg.sender);
                payerBadgeContract.updateBadge(msg.sender, msg.value);
            } else {
                payerBadgeContract.updateBadge(msg.sender, msg.value);
            }
        }

        emit PaymentCompleted(_sessionId, msg.sender, msg.value);
    }

    // MULTIPLAYER LOBBY: Get all participants
    function getSessionParticipants(uint256 _sessionId) external view returns (address[] memory) {
        return sessions[_sessionId].participants;
    }
}
