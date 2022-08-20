// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";
import {LibMarketplace} from "../libraries/LibMarketplace.sol";
import {MarketPlaceStorage} from "../storage/MarketPlaceStorage.sol";
import {ISokosCollection} from "../interfaces/ISokosCollection.sol";

contract NftManager is ReentrancyGuard {
    using Address for address;

    constructor() ReentrancyGuard() {}

    event TokenMint(
        address indexed beneficiary,
        address indexed nft,
        uint256 indexed id,
        uint256 supply,
        bytes metaData
    );

    /// @notice Token minter function, mints the Sokos Token's
    /// @param _nftRegistry - the address of NFT
    /// @param supply - the token supply
    /// @param metaDataURI - Asset meta Data URI
    /// @param _royaltiesRecipientAddress - the address of Royalty recipient
    /// @param _percentageBasisPoints - Percentage of royalty payment
    ///         minting NFT
    function mintSokosTradables(
        address _nftRegistry,
        uint256 supply,
        bytes memory metaDataURI,
        address _royaltiesRecipientAddress,
        uint96 _percentageBasisPoints
    ) public payable nonReentrant isSokosNFT(_nftRegistry) returns (uint256) {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        if (mStore.mintFee > 0) {
            require(
                msg.value >= mStore.mintFee,
                "Marketplace: insufficient mint fee"
            );
            Address.sendValue(mStore.feeReceipient, msg.value);
        }
        ISokosCollection registry = ISokosCollection(_nftRegistry);
        uint256 tokenId = registry.mint(
            supply,
            metaDataURI,
            payable(_royaltiesRecipientAddress),
            _percentageBasisPoints
        );
        registry.safeTransferFrom(
            address(this),
            msg.sender,
            tokenId,
            supply,
            bytes("")
        );
        emit TokenMint(msg.sender, _nftRegistry, tokenId, supply, metaDataURI);
        return tokenId;
    }

    function batchMintSokosNftTradables(
        address _nftRegistry,
        uint256[] memory supply,
        bytes[] memory metaDataURI,
        address _royaltiesRecipientAddress,
        uint96 _percentageBasisPoints
    ) external onlyOwner {
        require(
            supply.length == metaDataURI.length,
            "Marketplace: Invalid Mint array"
        );
        for (uint256 i = 0; i < supply.length; i++) {
            mintSokosTradables(
                _nftRegistry,
                supply[i],
                metaDataURI[i],
                _royaltiesRecipientAddress,
                _percentageBasisPoints
            );
        }
    }

    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    modifier isSokosNFT(address _nft) {
        require(LibMarketplace._isSokosNFT(_nft), "Marketplace: Invalid NFT address");
        _;
    }
}
