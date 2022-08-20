// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "../util/IERC20.sol";

struct Listing {
    uint256 itemId;
    address nftContract;
    uint256 tokenId;
    uint256 quantity;
    uint256 price;
    uint256 startingTime;
    uint256 expiresAt;
    address seller;
    bool sold;
    bool isERC1155;
    bool isAdminListed;
}

struct Offer {
    address offerer;
    IERC20 payToken;
    uint256 quantity;
    uint256 price;
    uint256 expiresAt;
    uint256 paidTokens;
}

struct Collection {
    string _name;
    string _displayName;
    string _symbol;
    address _address;
}

struct MarketPlaceStorage {
    mapping(address => bool) isSokosNFT; // mapping for collection address indicating if address is sokos collection address
    address[] sokosNFT; // Array of sokos collections
    address maticPriceFeed; // Chainlink price feed address of MATIC - USD
    address sokosTokenPriceFeed; // Address for price feed of sokos natic token
    /// @notice Sokos collections array
    Collection[] collections;
    uint256 _items;
    uint256 _soldItems;
    mapping(uint256 => Listing) listings;
    mapping(address => mapping(uint256 => mapping(address => bool)))
         isListed;
    /// @notice NftAddress -> Token ID -> Offer
    mapping(uint256 => Offer) offers;
    /// @notice Platform fee
    uint16 platformFee;
    /// @notice Platform mint fee
    uint256 mintFee;
    /// @notice Platform fee receipient
    address payable feeReceipient;
    /// @notice Platform acceptable token ( Token address to Feed)
    mapping(address => address) tokenToFeed;
}
