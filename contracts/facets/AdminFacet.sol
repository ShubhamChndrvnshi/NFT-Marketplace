// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";
import {LibMarketplace} from "../libraries/LibMarketplace.sol";
import {Listing, MarketPlaceStorage} from "../storage/MarketPlaceStorage.sol";
import {IERC1155Supply} from "../interfaces/IERC1155Supply.sol";
import "hardhat/console.sol";

contract AdminFacet {
    using Address for address;
    using SafeMath for uint256;

    bytes4 constant INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 constant INTERFACE_ID_ERC1155 = 0xd9b67a26;
    bytes4 constant _INTERFACE_ID_ERC2981 = 0x2a55205a;

    constructor() {}

    event ListingCreated(
        uint256 indexed itemId,
        address owner,
        address indexed nft,
        uint256 indexed tokenId,
        uint256 quantity,
        uint256 price,
        uint256 startingTime,
        uint256 expiresAt,
        bool isERC1155
    );

    /// @notice Method for listing NFT
    /// @param _nftAddress Address of NFT contract
    /// @param _tokenId Token ID of NFT
    /// @param _quantity token amount to list (needed for ERC-1155 NFTs, set as 1 for ERC-721)
    /// @param _pricePerItem sale price for each iteam
    /// @param _startingTime scheduling for a future sale
    function AdminCreateListing(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _quantity,
        uint256 _pricePerItem,
        uint256 _startingTime,
        uint256 _expiresAt,
        address seller
    ) external onlyOwner notListed(_nftAddress, _tokenId, seller) {
        bool isERC1155;
        if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC721)) {
            IERC721 nft = IERC721(_nftAddress);
            require(nft.ownerOf(_tokenId) == seller, "not owning item");
            require(
                nft.isApprovedForAll(seller, address(this)),
                "item not approved"
            );
            isERC1155 = false;
        } else if (
            IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC1155)
        ) {
            IERC1155Supply nft = IERC1155Supply(_nftAddress);
            require(
                nft.isApprovedForAll(seller, address(this)),
                "item not approved"
            );
            if (_expiresAt > block.timestamp) {
                try nft.totalSupply(_tokenId) returns (uint256 supply) {
                    require(
                        supply == 1,
                        "Marketplace: Item can't be listed for bidding"
                    );
                } catch {
                    revert("Marketplace: Asset can't be listed for bidding");
                }
            }
            isERC1155 = true;
        } else {
            revert("invalid nft address");
        }
        if (_quantity > 1) {
            _expiresAt = block.timestamp;
        }
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        ++mStore._items;
        mStore.isListed[_nftAddress][_tokenId][seller] = true;
        mStore.listings[mStore._items] = Listing(
            mStore._items,
            _nftAddress,
            _tokenId,
            _quantity,
            _pricePerItem,
            _startingTime,
            _expiresAt,
            seller,
            false,
            isERC1155,
            true
        );
        emit ListingCreated(
            mStore._items,
            seller,
            _nftAddress,
            _tokenId,
            _quantity,
            _pricePerItem,
            _startingTime,
            _expiresAt,
            isERC1155
        );
    }

    /////////////////////////////////////////
    ////////////////  MODIFIERS   ///////////
    /////////////////////////////////////////

    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    modifier notListed(
        address _nftAddress,
        uint256 _tokenId,
        address _potentialSeller
    ) {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        require(
            mStore.isListed[_nftAddress][_tokenId][_potentialSeller] == false,
            "already listed"
        );
        _;
    }
}
