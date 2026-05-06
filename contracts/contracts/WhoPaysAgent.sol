// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title WhoPaysAgent
 * @notice ERC-8004 compliant on-chain agent identity for the WhoPays PayBot.
 *         Lightweight version — removes Base64/on-chain JSON to minimise
 *         deployment gas. Agent Card metadata lives on IPFS.
 *
 * ERC-8004 Standard: Identity, Reputation, Validation registries for AI agents.
 * Reference: https://8004scan.io
 */

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract WhoPaysAgent is ERC721, Ownable {
    using Strings for uint256;

    // ── Constants ─────────────────────────────────────────────────────────────
    string public constant AGENT_NAME    = "WhoPays PayBot";
    string public constant AGENT_VERSION = "1.0.0";
    string public constant AGENT_TYPE    = "payment-agent";
    string public constant STANDARD      = "ERC-8004";

    // ── Agent Identity ────────────────────────────────────────────────────────
    struct AgentIdentity {
        address agentWallet;        // EOA used by the agent to sign txs
        string  agentCardURI;       // IPFS URI → Agent Card JSON
        string  selfAgentId;        // Self Protocol verified identity ID
        bool    selfVerified;
        uint256 registeredAt;
        uint256 totalSessionsHandled;
        uint256 totalValueSettled;
    }

    AgentIdentity public agentIdentity;

    // ── Reputation ────────────────────────────────────────────────────────────
    struct Attestation {
        address from;
        uint8   rating;     // 1–5
        uint256 sessionId;
        uint256 timestamp;
    }

    Attestation[] public attestations;
    mapping(address => bool) public hasAttested;

    // ── Events ────────────────────────────────────────────────────────────────
    event AgentRegistered(address indexed wallet, string agentCardURI);
    event SelfVerified(string selfAgentId);
    event AgentActionExecuted(uint256 indexed sessionId, string action);
    event AttestationSubmitted(address indexed from, uint8 rating, uint256 sessionId);
    event AgentCardUpdated(string newURI);

    // ── Modifier ──────────────────────────────────────────────────────────────
    modifier onlyAgentWallet() {
        require(msg.sender == agentIdentity.agentWallet, "Not agent wallet");
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(address _agentWallet) ERC721("WhoPays PayBot", "PAYBOT") {
        agentIdentity.agentWallet  = _agentWallet;
        agentIdentity.registeredAt = block.timestamp;
        _mint(msg.sender, 1); // Mint soulbound identity NFT
    }

    // ── Registration ──────────────────────────────────────────────────────────

    /// @notice Register the agent with an IPFS Agent Card URI
    function registerAgent(string calldata _agentCardURI) external onlyOwner {
        require(bytes(_agentCardURI).length > 0, "Empty URI");
        agentIdentity.agentCardURI = _agentCardURI;
        emit AgentRegistered(agentIdentity.agentWallet, _agentCardURI);
    }

    /// @notice Record Self Protocol ZK-verification on-chain
    function recordSelfVerification(string calldata _selfAgentId) external onlyOwner {
        require(bytes(_selfAgentId).length > 0, "Empty Self Agent ID");
        agentIdentity.selfAgentId  = _selfAgentId;
        agentIdentity.selfVerified = true;
        emit SelfVerified(_selfAgentId);
    }

    /// @notice Update the IPFS Agent Card URI
    function updateAgentCard(string calldata _newURI) external onlyOwner {
        agentIdentity.agentCardURI = _newURI;
        emit AgentCardUpdated(_newURI);
    }

    // ── Agent Actions (proves the agent executes onchain txs) ─────────────────

    /// @notice Agent logs an autonomous action — satisfies ERC-8004 "wallet with onchain tx"
    function logAgentAction(uint256 sessionId, string calldata action) external onlyAgentWallet {
        agentIdentity.totalSessionsHandled++;
        emit AgentActionExecuted(sessionId, action);
    }

    /// @notice Agent records an autonomous payment settlement
    function recordSettlement(uint256 sessionId, uint256 valueWei) external onlyAgentWallet {
        agentIdentity.totalValueSettled    += valueWei;
        agentIdentity.totalSessionsHandled++;
        emit AgentActionExecuted(sessionId, "auto-settlement");
    }

    // ── Reputation ────────────────────────────────────────────────────────────

    /// @notice Submit a 1–5 star attestation about the agent
    function submitAttestation(uint8 rating, uint256 sessionId) external {
        require(rating >= 1 && rating <= 5, "Rating 1-5 only");
        require(!hasAttested[msg.sender], "Already attested");
        hasAttested[msg.sender] = true;
        attestations.push(Attestation({
            from:      msg.sender,
            rating:    rating,
            sessionId: sessionId,
            timestamp: block.timestamp
        }));
        emit AttestationSubmitted(msg.sender, rating, sessionId);
    }

    /// @notice Average rating ×10 (e.g. 45 = 4.5 stars)
    function getAverageRating() external view returns (uint256) {
        if (attestations.length == 0) return 0;
        uint256 total = 0;
        for (uint256 i = 0; i < attestations.length; i++) {
            total += attestations[i].rating;
        }
        return (total * 10) / attestations.length;
    }

    function getAttestationCount() external view returns (uint256) {
        return attestations.length;
    }

    // ── Token URI (points to IPFS Agent Card) ─────────────────────────────────
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(tokenId == 1, "Token does not exist");
        // Return the IPFS Agent Card URI directly if set, otherwise a default
        if (bytes(agentIdentity.agentCardURI).length > 0) {
            return agentIdentity.agentCardURI;
        }
        return "https://whopays.vercel.app/api/agent";
    }

    // ── View Helper ───────────────────────────────────────────────────────────
    function getAgentCard() external view returns (
        address wallet,
        string memory agentCardURI,
        string memory selfAgentId,
        bool    selfVerified,
        uint256 registeredAt,
        uint256 totalSessions,
        uint256 totalValue
    ) {
        AgentIdentity storage ai = agentIdentity;
        return (
            ai.agentWallet,
            ai.agentCardURI,
            ai.selfAgentId,
            ai.selfVerified,
            ai.registeredAt,
            ai.totalSessionsHandled,
            ai.totalValueSettled
        );
    }

    // ── Soulbound: block transfers ─────────────────────────────────────────────
    function transferFrom(address, address, uint256) public pure override {
        revert("Non-transferable identity");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("Non-transferable identity");
    }
}
