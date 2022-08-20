// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {IERC20} from "../util/IERC20.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";
import {LibMarketplace} from "../libraries/LibMarketplace.sol";
import {Listing, Offer, MarketPlaceStorage} from "../storage/MarketPlaceStorage.sol";
import {ISokosCollection} from "../interfaces/ISokosCollection.sol";
import {IERC1155Supply} from "../interfaces/IERC1155Supply.sol";
import "hardhat/console.sol";

contract ListingManager is ReentrancyGuard {
    using Address for address;
    using SafeMath for uint256;

    bytes4 public constant INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 public constant INTERFACE_ID_ERC1155 = 0xd9b67a26;
    bytes4 public constant _INTERFACE_ID_ERC2981 = 0x2a55205a;

    constructor() ReentrancyGuard() {}

    function listings(uint256 _itemId) external view returns (Listing memory) {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        return mStore.listings[_itemId];
    }

    function offers(uint256 _itemId) external view returns (Offer memory) {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        return mStore.offers[_itemId];
    }

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
    function CreateListing(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _quantity,
        uint256 _pricePerItem,
        uint256 _startingTime,
        uint256 _expiresAt
    ) external nonReentrant notListed(_nftAddress, _tokenId, msg.sender) {
        bool isERC1155;
        if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC721)) {
            IERC721 nft = IERC721(_nftAddress);
            require(nft.ownerOf(_tokenId) == msg.sender, "not owning item");
            require(
                nft.isApprovedForAll(msg.sender, address(this)),
                "item not approved"
            );
            nft.transferFrom(msg.sender, address(this), _tokenId);
            isERC1155 = false;
        } else if (
            IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC1155)
        ) {
            IERC1155Supply nft = IERC1155Supply(_nftAddress);
            require(
                nft.balanceOf(msg.sender, _tokenId) >= _quantity,
                "must hold enough nfts"
            );
            require(
                nft.isApprovedForAll(msg.sender, address(this)),
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
            nft.safeTransferFrom(
                msg.sender,
                address(this),
                _tokenId,
                _quantity,
                bytes("")
            );
            isERC1155 = true;
        } else {
            revert("invalid nft address");
        }
        if (_quantity > 1) {
            _expiresAt = block.timestamp;
        }
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        ++mStore._items;
        mStore.isListed[_nftAddress][_tokenId][msg.sender] = true;
        mStore.listings[mStore._items] = Listing(
            mStore._items,
            _nftAddress,
            _tokenId,
            _quantity,
            _pricePerItem,
            _startingTime,
            _expiresAt,
            msg.sender,
            false,
            isERC1155,
            false
        );
        emit ListingCreated(
            mStore._items,
            msg.sender,
            _nftAddress,
            _tokenId,
            _quantity,
            _pricePerItem,
            _startingTime,
            _expiresAt,
            isERC1155
        );
    }

    /// @notice Method for canceling listed NFT
    function cancelListing(uint256 _itemId)
        external
        nonReentrant
        isListed(_itemId)
    {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        Listing memory listedItem = mStore.listings[_itemId];
        require(
            mStore.isListed[listedItem.nftContract][listedItem.tokenId][
                listedItem.seller
            ],
            "Not listed"
        );
        require(listedItem.seller == msg.sender, "Not Authorised");

        if (listedItem.isAdminListed == false) {
            _returnNftToOwner(_itemId);
        }
        _cancelNftOffers(_itemId);
        _cancelListing(_itemId);
    }

    /// @notice Method for cancelling previous offers on the NFT
    /// @param _itemId Token ID of NFT
    function _cancelNftOffers(uint256 _itemId) internal {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        Offer memory currentOffer = mStore.offers[_itemId];
        if (currentOffer.offerer != address(0)) {
            currentOffer.payToken.transfer(
                currentOffer.offerer,
                currentOffer.paidTokens
            );
            delete mStore.offers[_itemId];
        }
    }

    event ListingUpdated(
        address indexed owner,
        address indexed nft,
        uint256 indexed tokenId,
        uint256 newPrice
    );

    /// @notice Method for updating listed NFT
    /// @param _itemId Token ID of NFT
    /// @param _newPrice New sale price for each iteam
    function updateListing(uint256 _itemId, uint256 _newPrice)
        external
        nonReentrant
        isListed(_itemId)
    {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        Listing memory listedItem = mStore.listings[_itemId];
        require(
            mStore.offers[_itemId].offerer == address(0),
            "Can not update price during bidding"
        );
        require(listedItem.isAdminListed == false,"Not allowed..!!");
        require(listedItem.seller == msg.sender, "Not allowed");
        listedItem.price = _newPrice;
        emit ListingUpdated(
            msg.sender,
            listedItem.nftContract,
            listedItem.tokenId,
            _newPrice
        );
    }

    /////////////////////////////////////////
    ///// HELPER FUNCTIONS NFT BUY/SELL /////
    /////////////////////////////////////////

    event ListingCancelled(
        address indexed owner,
        address indexed nft,
        uint256 tokenId
    );

    function _cancelListing(uint256 _itemId) internal {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        emit ListingCancelled(
            mStore.listings[_itemId].seller,
            mStore.listings[_itemId].nftContract,
            mStore.listings[_itemId].tokenId
        );
        delete mStore.isListed[mStore.listings[_itemId].nftContract][
            mStore.listings[_itemId].tokenId
        ][mStore.listings[_itemId].seller];
        delete (mStore.listings[_itemId]);
    }

    /// @notice Method for returning the NFT to owner
    /// @param _itemId Token ID of NFT
    function _returnNftToOwner(uint256 _itemId) internal {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        Listing storage listedItem = mStore.listings[_itemId];
        if (listedItem.isERC1155) {
            IERC1155(listedItem.nftContract).safeTransferFrom(
                address(this),
                listedItem.seller,
                listedItem.tokenId,
                listedItem.quantity,
                bytes("")
            );
        } else {
            IERC721(listedItem.nftContract).transferFrom(
                address(this),
                listedItem.seller,
                listedItem.tokenId
            );
        }
    }

    /////////////////////////////////////////
    ////////////////  MODIFIERS   ///////////
    /////////////////////////////////////////

    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    modifier isListed(uint256 _itemId) {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        require(
            mStore.listings[_itemId].quantity > 0,
            "not listed item/sold out"
        );
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

    modifier offerExists(uint256 _itemId) {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        require(
            mStore.offers[_itemId].offerer != address(0),
            "offer not exists"
        );
        _;
    }
}
