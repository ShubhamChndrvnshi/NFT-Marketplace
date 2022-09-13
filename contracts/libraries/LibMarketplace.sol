// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "./LibDiamond.sol";
import {MarketPlaceStorage} from "../storage/MarketPlaceStorage.sol";
import {IERC20} from "../util/IERC20.sol";
import {Listing, Offer, MarketPlaceStorage} from "../storage/MarketPlaceStorage.sol";
import {LibMarketplace} from "./LibMarketplace.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
// import "hardhat/console.sol";

library LibMarketplace {
    bytes4 constant INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 constant INTERFACE_ID_ERC1155 = 0xd9b67a26;
    bytes4 constant _INTERFACE_ID_ERC2981 = 0x2a55205a;

    function _cancelOffer(Listing storage listedItem)
        internal
        offerExists(listedItem.itemId)
    {
        MarketPlaceStorage storage mStore = applicationStorage();
        Offer memory offer = mStore.offers[listedItem.itemId];
        offer.payToken.transfer(offer.offerer, offer.paidTokens);
        delete (mStore.offers[listedItem.itemId]);
    }

    /// @notice Method for returning the NFT to owner
    /// @param _nftAddress Address of NFT contract
    /// @param _tokenId Token ID of NFT
    /// @param benefeciery Benifeciery where NFT to be sent
    /// @param _quantity Number of NFT to be sent
    function _sendNFT(
        uint256 _itemId,
        address _nftAddress,
        uint256 _tokenId,
        address benefeciery,
        uint256 _quantity
    ) internal {
        MarketPlaceStorage storage mStore = applicationStorage();
        address nftOwner;
        if (mStore.listings[_itemId].isAdminListed) {
            nftOwner = mStore.listings[_itemId].seller;
        } else {
            nftOwner = address(this);
        }
        // Transfer NFT to buyer
        if (IERC165(_nftAddress).supportsInterface(INTERFACE_ID_ERC721)) {
            IERC721(_nftAddress).safeTransferFrom(
                nftOwner,
                benefeciery,
                _tokenId
            );
        } else {
            IERC1155(_nftAddress).safeTransferFrom(
                nftOwner,
                benefeciery,
                _tokenId,
                _quantity,
                bytes("")
            );
        }
    }

    // returns all unsold marketplace items
    function _fetchMarketplaceItems() internal view returns (Listing[] memory) {
        MarketPlaceStorage storage mStore = applicationStorage();
        uint256 itemCount = mStore._items;
        uint256 unsoldItemCount = 0;

        for (uint256 i = 1; i <= itemCount; i++) {
            if (
                mStore.listings[i].seller != address(0) &&
                mStore.listings[i].sold == false
            ) {
                unsoldItemCount++;
            }
        }

        uint256 currentIndex = 0;

        Listing[] memory items = new Listing[](unsoldItemCount);
        for (uint256 i = 1; i <= itemCount; i++) {
            if (
                mStore.listings[i].seller != address(0) &&
                mStore.listings[i].sold == false
            ) {
                Listing storage currentItem = mStore.listings[i];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    // returns only items that a user has purchased
    function _fetchMyNFTs() internal view returns (Listing[] memory) {
        MarketPlaceStorage storage mStore = applicationStorage();
        uint256 totalItemCount = mStore._items;
        uint256 itemCount = 0;
        uint256 currentIndex = 0;
        for (uint256 i = 0; i <= totalItemCount; i++) {
            if (mStore.listings[i].seller == msg.sender) {
                itemCount += 1;
            }
        }

        Listing[] memory items = new Listing[](itemCount);
        for (uint256 i = 0; i <= totalItemCount; i++) {
            if (mStore.listings[i].seller == msg.sender) {
                Listing storage currentItem = mStore.listings[i];
                items[currentIndex] = currentItem;
                currentIndex++;
            }
        }
        return items;
    }

    modifier offerExists(uint256 _itemId) {
        MarketPlaceStorage storage mStore = applicationStorage();
        require(
            mStore.offers[_itemId].offerer != address(0),
            "offer not exists"
        );
        _;
    }

    function _isSokosNFT(address collection) internal view returns (bool) {
        MarketPlaceStorage storage mStore = applicationStorage();
        return mStore.isSokosNFT[collection];
    }

    function applicationStorage()
        internal
        view
        returns (MarketPlaceStorage storage appStore)
    {
        bytes32 position = (LibDiamond.contractStoragePositions())[0];
        assembly {
            appStore.slot := position
        }
    }

    function enforceHasContractCode(
        address _contract,
        string memory _errorMessage
    ) internal view {
        uint256 contractSize;
        assembly {
            contractSize := extcodesize(_contract)
        }
        require(contractSize > 0, _errorMessage);
    }

    function addressExistsInArray(address[] memory self, address element)
        internal
        pure
        returns (bool)
    {
        for (uint256 i = 0; i < self.length; i++) {
            if (self[i] == element) {
                return true;
            }
        }
        return false;
    }
}
