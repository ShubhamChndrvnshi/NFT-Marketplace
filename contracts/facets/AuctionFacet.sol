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
import {LibRoyaltyManager} from "../libraries/LibRoyaltyManager.sol";
import "hardhat/console.sol";

contract AuctionFacet is ReentrancyGuard {
    using Address for address;
    using SafeMath for uint256;

    bytes4 constant INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 constant INTERFACE_ID_ERC1155 = 0xd9b67a26;
    bytes4 constant _INTERFACE_ID_ERC2981 = 0x2a55205a;

    constructor() ReentrancyGuard() {}

    /// @notice Method for buying listed NFT
    /// @param _itemId Listing Id
    /// @param _quantity TokenId buyItemERC20
    function buyItemEth(uint256 _itemId, uint256 _quantity)
        external
        payable
        nonReentrant
        isListed(_itemId)
    {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        Listing storage listedItem = mStore.listings[_itemId];
        require(listedItem.seller != msg.sender, "Sellers not allowed");
        require(mStore.listings[listedItem.itemId].sold == false, "Sold out");
        require(_quantity <= listedItem.quantity, "stock unavailable");
        require(
            listedItem.expiresAt < block.timestamp,
            "bidding period not over"
        );
        require(msg.value > 0, "No fund sent for purchase");
        _buyItem(_quantity, listedItem);
    }

    event ItemSold(
        address owner,
        address indexed buyer,
        address indexed nft,
        uint256 indexed tokenId,
        uint256 quantity,
        uint256 stock,
        address payToken,
        uint256 price
    );

    function _buyItem(uint256 _quantity, Listing storage listedItem) private {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        uint256 maticInUSD = getConversionRate(msg.value);
        require(
            _quantity * (listedItem.price * 1e18) <= maticInUSD,
            "Marketplace: inadequate MATIC sent"
        );
        // PRICE PAID
        uint256 feeAmount = uint256(msg.value).mul(mStore.platformFee).div(1e4);
        Address.sendValue(payable(mStore.feeReceipient), feeAmount);

        uint256 price = uint256(msg.value).sub(feeAmount);

        if (LibRoyaltyManager._checkRoyalties(listedItem.nftContract)) {
            uint256 royaltiesAmount;
            (price, royaltiesAmount) = LibRoyaltyManager._deduceRoyalties(
                listedItem.nftContract,
                listedItem.tokenId,
                price,
                address(0)
            );
            // Broadcast royalties payment
            emit RoyaltiesPaid(
                listedItem.nftContract,
                listedItem.tokenId,
                royaltiesAmount
            );
        }
        Address.sendValue(payable(listedItem.seller), price);

        listedItem.quantity -= _quantity;
        // Transfer NFT to buyer
        LibMarketplace._sendNFT(
            listedItem.itemId,
            listedItem.nftContract,
            listedItem.tokenId,
            msg.sender,
            _quantity
        );
        mStore._soldItems++;
        emit ItemSold(
            listedItem.seller,
            msg.sender,
            listedItem.nftContract,
            listedItem.tokenId,
            _quantity,
            listedItem.quantity,
            address(0),
            listedItem.price.mul(_quantity)
        );
        if (listedItem.quantity == 0) {
            mStore.listings[listedItem.itemId].sold = true;
        }
    }

    function buyItemERC20(
        uint256 _itemId,
        address _payToken,
        uint256 _quantity
    ) external {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        Listing storage listedItem = mStore.listings[_itemId];
        require(listedItem.seller != msg.sender, "Sellers not allowed");
        require(mStore.listings[listedItem.itemId].sold == false, "Sold out");
        require(_quantity <= listedItem.quantity, "stock unavailable");
        require(
            listedItem.expiresAt < block.timestamp,
            "bidding period not over"
        );
        require(
            mStore.tokenToFeed[_payToken] != address(0),
            "Token not accepted as payment"
        );
        uint256 price = listedItem.price * _quantity * 1e18;

        require(
            getTokenConversionRate(
                IERC20(_payToken).allowance(msg.sender, address(this)),
                _payToken
            ) >= (price + price.mul(mStore.platformFee).div(1e4)),
            "Marketplace: tokens spend approved not enough"
        );

        uint256 tokensAsPerPrice = (price.mul(10**18)).div(
            getPrice(mStore.tokenToFeed[_payToken])
        );

        // Aquire ERC20 tokens in Marketplace
        IERC20(_payToken).transferFrom(
            msg.sender,
            address(this),
            tokensAsPerPrice
        );

        IERC20(_payToken).transferFrom(
            msg.sender,
            mStore.feeReceipient,
            (price.mul(mStore.platformFee).div(1e4).mul(10**18)).div(
                getPrice(mStore.tokenToFeed[_payToken])
            )
        );

        if (LibRoyaltyManager._checkRoyalties(listedItem.nftContract)) {
            uint256 royaltiesAmount;
            (tokensAsPerPrice, royaltiesAmount) = LibRoyaltyManager
                ._deduceRoyalties(
                    listedItem.nftContract,
                    listedItem.tokenId,
                    tokensAsPerPrice,
                    _payToken
                );
            // Broadcast royalties payment
            emit RoyaltiesPaid(
                listedItem.nftContract,
                listedItem.tokenId,
                royaltiesAmount
            );
        }

        // price = price.sub(feeAmount);

        IERC20(_payToken).transfer(listedItem.seller, tokensAsPerPrice);

        listedItem.quantity -= _quantity;

        LibMarketplace._sendNFT(
            _itemId,
            listedItem.nftContract,
            listedItem.tokenId,
            msg.sender,
            _quantity
        );
        mStore._soldItems++;
        emit ItemSold(
            listedItem.seller,
            msg.sender,
            listedItem.nftContract,
            listedItem.tokenId,
            _quantity,
            listedItem.quantity,
            _payToken,
            listedItem.price * _quantity
        );
        if (listedItem.quantity == 0) {
            mStore.listings[listedItem.itemId].sold = true;
        }
    }

    event BidCreated(
        address indexed bidder,
        address indexed nft,
        address indexed owner,
        uint256 tokenId,
        address payToken,
        uint256 bid,
        uint256 expiresAt
    );

    event BidCancelled(
        address indexed bidder,
        address indexed nft,
        address indexed nftOwner,
        uint256 tokenId
    );

    /// @notice Method for offering item
    /// @param _itemId TokenId
    /// @param _payToken Paying token
    /// @param _price Price of item
    /// @param _expiresAt Offer expiration
    function safePlaceBid(
        uint256 _itemId,
        address _payToken,
        uint256 _price,
        uint256 _expiresAt
    ) external nonReentrant _validPayToken(_payToken) {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();

        Listing storage listedItem = mStore.listings[_itemId];
        require(
            listedItem.quantity > 0 &&
                mStore.listings[listedItem.itemId].sold == false,
            "stock unavailable"
        );
        require(msg.sender.isContract() == false, "no contracts permitted");
        require(listedItem.seller != msg.sender, "Sellers not allowed");

        Offer storage offer = mStore.offers[_itemId];
        require(listedItem.expiresAt > block.timestamp, "bidding period over");

        if (offer.offerer != address(0)) {
            if (offer.expiresAt >= block.timestamp) {
                require(
                    _price > offer.price,
                    "Marketplace: bid price should be higher than last bid"
                );
            } else {
                require(
                    _price > listedItem.price,
                    "Marketplace: bid should be greater than reserve price"
                );
            }
            require(
                offer.offerer != msg.sender,
                "Marketplace: Can't bid unless someone else has bid"
            );
            LibMarketplace._cancelOffer(listedItem);
            emit BidCancelled(
                offer.offerer,
                listedItem.nftContract,
                listedItem.seller,
                listedItem.tokenId
            );
        } else {
            require(
                _price > listedItem.price,
                "Marketplace: bid should be greater than reserve price"
            );
        }

        uint256 price = uint256(_price.mul(10**18)).mul(listedItem.quantity);

        require(
            getTokenConversionRate(
                IERC20(_payToken).allowance(msg.sender, address(this)),
                _payToken
            ) >= price,
            "Marketplace: tokens spend approved not enough"
        );

        uint256 tokenAmountToBePaid = price.mul(1e18).div(
            getPrice(mStore.tokenToFeed[_payToken])
        );

        IERC20(_payToken).transferFrom(
            msg.sender,
            address(this),
            tokenAmountToBePaid
        );

        mStore.offers[_itemId] = Offer(
            msg.sender,
            IERC20(_payToken),
            listedItem.quantity,
            _price,
            _expiresAt,
            tokenAmountToBePaid
        );

        emit BidCreated(
            msg.sender,
            listedItem.nftContract,
            listedItem.seller,
            listedItem.tokenId,
            _payToken,
            _price,
            _expiresAt
        );
    }

    function cancelOffer(uint256 _itemId) internal offerExists(_itemId) {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        Offer memory offer = mStore.offers[_itemId];
        require(offer.offerer == msg.sender, "Invalid Transaction");
        Listing storage listedItem = mStore.listings[_itemId];
        LibMarketplace._cancelOffer(listedItem);
        emit BidCancelled(
            offer.offerer,
            listedItem.nftContract,
            listedItem.seller,
            listedItem.tokenId
        );
    }

    event BidAccepted(
        address indexed bidder,
        address indexed nft,
        address indexed nftOwner,
        uint256 tokenId,
        uint256 price,
        uint256 tokenPaid
    );

    /// @notice Method for accepting the offer
    /// @param _itemId TokenId
    function acceptOffer(uint256 _itemId)
        external
        nonReentrant
        offerExists(_itemId)
    {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();

        Offer memory offer = mStore.offers[_itemId];
        require(offer.expiresAt > block.timestamp, "highest bid expired");

        uint256 feeAmount = offer.paidTokens.mul(mStore.platformFee).div(1e4);
        uint256 price = offer.paidTokens.sub(feeAmount);

        offer.payToken.transfer(mStore.feeReceipient, feeAmount);

        Listing memory listedItem = mStore.listings[_itemId];
        if (LibRoyaltyManager._checkRoyalties(listedItem.nftContract)) {
            uint256 royaltiesAmount;
            (price, royaltiesAmount) = LibRoyaltyManager._deduceRoyalties(
                listedItem.nftContract,
                listedItem.tokenId,
                price,
                address(offer.payToken)
            );
            // Broadcast royalties payment
            emit RoyaltiesPaid(
                listedItem.nftContract,
                listedItem.tokenId,
                royaltiesAmount
            );
        }

        offer.payToken.transfer(msg.sender, price);

        LibMarketplace._sendNFT(
            _itemId,
            listedItem.nftContract,
            listedItem.tokenId,
            offer.offerer,
            1
        );

        mStore._soldItems++;

        emit ItemSold(
            msg.sender,
            offer.offerer,
            listedItem.nftContract,
            listedItem.tokenId,
            offer.quantity,
            0,
            address(offer.payToken),
            offer.price
        );

        emit BidAccepted(
            offer.offerer,
            listedItem.nftContract,
            msg.sender,
            listedItem.tokenId,
            offer.price,
            offer.paidTokens
        );

        delete (mStore.listings[_itemId]);
        delete (mStore.offers[_itemId]);
    }

    ///////////////////////////////////////
    ///// CHAIN LINK HELPER FUNCTIONS /////
    ///////////////////////////////////////

    function getPrice(address _priceFeed) public view returns (uint256) {
        (, int256 answer, , , ) = AggregatorV3Interface(_priceFeed)
            .latestRoundData();
        return
            uint256(answer) *
            (10**(18 - AggregatorV3Interface(_priceFeed).decimals()));
    }

    function getConversionRate(uint256 maticAmount)
        public
        view
        returns (uint256)
    {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        uint256 ethPrice = getPrice(mStore.maticPriceFeed); // 262784346 ;
        uint256 maticAmountInUsd = (ethPrice * maticAmount) /
            1000000000000000000;
        return maticAmountInUsd;
    }

    function getTokenConversionRate(uint256 tokenAmount, address _token)
        public
        view
        returns (uint256)
    {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        require(
            mStore.tokenToFeed[_token] != address(0),
            "Marketplace: Token not acceptable as payment"
        );
        uint256 tokenPrice = getPrice(mStore.tokenToFeed[_token]); // 262784346 ;
        uint256 priceInUSD = (tokenPrice * tokenAmount) / 1000000000000000000;
        return priceInUSD;
    }

    /////////////////////////////////////////
    ///// HELPER FUNCTIONS NFT BUY/SELL /////
    /////////////////////////////////////////

    event RoyaltiesPaid(address nft, uint256 tokenId, uint256 value);

    /////////////////////////////////////////
    ////////////////  MODIFIERS   ///////////
    /////////////////////////////////////////

    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    modifier _validPayToken(address _payToken) {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        require(
            _payToken.isContract(),
            "Marketplace: The accepted token address must be a deployed contract"
        );
        require(
            mStore.tokenToFeed[_payToken] != address(0),
            "Marketplace: Token is not accepted as payment"
        );
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

    modifier offerExists(uint256 _itemId) {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        require(
            mStore.offers[_itemId].offerer != address(0),
            "offer not exists"
        );
        _;
    }
}
