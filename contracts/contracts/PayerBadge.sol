// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract PayerBadge is ERC721, Ownable {
    uint256 private _nextTokenId = 1;

    struct Badge {
        uint256 totalPaid;
        uint256 sessionsPaid;
        uint256 lastPaidAt;
        string rarity;
    }

    mapping(uint256 => Badge) public badges;
    mapping(address => uint256) public userBadges;

    event BadgeMinted(address indexed user, uint256 indexed tokenId, string rarity);
    event BadgeUpdated(uint256 indexed tokenId, uint256 totalPaid, uint256 sessionsPaid);

    constructor() ERC721("Payeer Badge", "PAYBADGE") {}

    function mintBadge(address to) external onlyOwner returns (uint256) {
        require(userBadges[to] == 0, "User already has a badge");

        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        userBadges[to] = tokenId;

        badges[tokenId] = Badge({
            totalPaid: 0,
            sessionsPaid: 0,
            lastPaidAt: block.timestamp,
            rarity: "Bronze"
        });

        emit BadgeMinted(to, tokenId, "Bronze");
        return tokenId;
    }

    function updateBadge(address user, uint256 amount) external onlyOwner {
        uint256 tokenId = userBadges[user];
        require(tokenId != 0, "User has no badge");

        Badge storage badge = badges[tokenId];
        badge.totalPaid += amount;
        badge.sessionsPaid += 1;
        badge.lastPaidAt = block.timestamp;

        // Update rarity based on total paid
        if (badge.totalPaid >= 100 ether) {
            badge.rarity = "Diamond";
        } else if (badge.totalPaid >= 50 ether) {
            badge.rarity = "Gold";
        } else if (badge.totalPaid >= 10 ether) {
            badge.rarity = "Silver";
        } else if (badge.totalPaid >= 1 ether) {
            badge.rarity = "Bronze";
        }

        emit BadgeUpdated(tokenId, badge.totalPaid, badge.sessionsPaid);
    }

    function getBadge(address user) external view returns (Badge memory) {
        uint256 tokenId = userBadges[user];
        require(tokenId != 0, "User has no badge");
        return badges[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        Badge memory badge = badges[tokenId];
        
        return string(abi.encodePacked(
            "data:application/json;base64,",
            "eyJuYW1lIjoiUGF5ZWVyIEJhZGdlICMi",
            Strings.toString(tokenId),
            "IiwgImRlc2NyaXB0aW9uIjoiQSBiYWRnZSBlYXJuZWQgYnkgcGF5aW5nIGJpbGxzIG9uIFBheWVlciIsICJhdHRyaWJ1dGVzIjpbeyJ0cmFpdF90eXBlIjoiUmFyaXR5IiwgInZhbHVlIjoi",
            badge.rarity,
            "\"}]}"
        ));
    }
}