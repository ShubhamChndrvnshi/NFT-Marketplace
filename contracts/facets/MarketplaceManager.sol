// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {MarketPlaceStorage, Listing} from "../storage/MarketPlaceStorage.sol";
import {LibMarketplace} from "../libraries/LibMarketplace.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";

contract MarketplaceManager {
    constructor() {}

    function platformFee() public view returns (uint256) {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        return mStore.platformFee;
    }

    function feeReceipient() public view returns (address) {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        return mStore.feeReceipient;
    }

    function mintFee() public view returns (uint256) {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        return mStore.mintFee;
    }

    function maticPriceFeed() public view returns (address) {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        return mStore.maticPriceFeed;
    }

    function updateMaticPriceFeed(address priceFeed) onlyOwner external {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        mStore.maticPriceFeed = priceFeed;
    }

    function fetchMarketplaceItems() external view returns(Listing[] memory){
        return LibMarketplace._fetchMarketplaceItems();
    }

    function fetchUserItems() external view returns(Listing[] memory){
        return LibMarketplace._fetchMyNFTs();
    }

    event UpdatePlatformFee(uint16 platformFee);

    /**
     @notice Method for updating platform fee
     @dev Only admin
     @param _platformFee uint16 the platform fee to set
     */
    function updatePlatformFee(uint16 _platformFee) external onlyOwner {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        mStore.platformFee = _platformFee;
        emit UpdatePlatformFee(_platformFee);
    }

    event UpdatePlatformMintFee(uint256 platformMintFee);

    function updatePlatformMintFee(uint256 _mintFee) external onlyOwner {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        mStore.mintFee = _mintFee;
        emit UpdatePlatformMintFee(_mintFee);
    }

    event UpdatePlatformFeeRecipient(address payable platformFeeRecipient);

    /**
     @notice Method for updating platform fee address
     @dev Only admin
     @param _platformFeeRecipient payable address the address to sends the funds to
     */
    function updatePlatformFeeRecipient(address payable _platformFeeRecipient)
        external
        onlyOwner
    {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        mStore.feeReceipient = _platformFeeRecipient;
        emit UpdatePlatformFeeRecipient(_platformFeeRecipient);
    }

    ///////////////////////////////////////
    ///// CHAIN LINK HELPER FUNCTIONS /////
    ///////////////////////////////////////

    event PaymentOptionAdded(address _paytoken);

    function addTokenFeed(address _token, address feed) public onlyOwner {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        LibDiamond.enforceHasContractCode(
            _token,
            "Marketplace: Token address must be a deployed contract"
        );
        LibDiamond.enforceHasContractCode(
            feed,
            "Marketplace: Token feed must be a deployed contract"
        );
        mStore.tokenToFeed[_token] = feed;
        emit PaymentOptionAdded(_token);
    }

    event PaymentOptionRemoved(address _paytoken);

    function removePaymentOption(address _token) public onlyOwner {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        delete mStore.tokenToFeed[_token];
        emit PaymentOptionRemoved(_token);
    }

    /////////////////////////////////////////
    ////////////////  MODIFIERS   ///////////
    /////////////////////////////////////////

    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
}
