// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {LibMarketplace} from "../libraries/LibMarketplace.sol";
import {MarketPlaceStorage, Collection} from "../storage/MarketPlaceStorage.sol";
import {SokosCollection} from "../util/SokosCollection.sol";

contract CollectionManagerFacet {
    event CollectionAdd(string name, string symbol, string displayName, address collection);
    event CollectionRemove(address collection);
    /**
     @notice method to create new collections
     @dev Only Admin
     */
    function createCollection(
        string memory _name,
        string memory _symbol,
        string memory _displayName,
        bool _isPublic
    ) external onlyOwner {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        for (uint256 i; i < mStore.collections.length; i++) {
            require(
                (keccak256(abi.encodePacked(mStore.collections[i]._name)) !=
                    keccak256(abi.encodePacked(_name))),
                "Registry: Duplicate collection name"
            );
            require(
                (keccak256(
                    abi.encodePacked(mStore.collections[i]._displayName)
                ) != keccak256(abi.encodePacked(_displayName))),
                "Registry: Duplicate collection display name"
            );
            require(
                (keccak256(abi.encodePacked(mStore.collections[i]._symbol)) !=
                    keccak256(abi.encodePacked(_symbol))),
                "Registry: Duplicate collection symbol"
            );
        }
        SokosCollection newCollection = new SokosCollection(
            address(this),
            _name,
            _symbol,
            _isPublic,
            LibDiamond.contractOwner()
        );
        mStore.collections.push(
            Collection(_name, _displayName, _symbol, address(newCollection))
        );
        mStore.isSokosNFT[address(newCollection)] = true;
        emit CollectionAdd(_name, _symbol, _displayName, address(newCollection));
    }

    /**
     @notice Remove collection from registry
     @dev Only Admin
     */
    function removeCollection(string memory _name, address _collection)
        external
        onlyOwner
        returns (bool)
    {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();

        for (uint256 i; i < mStore.collections.length; i++) {
            Collection memory coll = mStore.collections[i];
            if (
                (keccak256(abi.encodePacked(coll._name)) ==
                    keccak256(abi.encodePacked(_name))) &&
                (coll._address == _collection)
            ) {
                mStore.collections[i] = mStore.collections[
                    mStore.collections.length - 1
                ];
                mStore.collections.pop();
                emit CollectionRemove(_collection);
                return true;
            }
        }
        return false;
    }

    function isSokosNFT(address collection) external view returns(bool){
        return LibMarketplace._isSokosNFT(collection);
    }

    function collections(uint256 pos) external view returns (Collection memory) {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();
        return mStore.collections[pos];
    }

    function getCollectionsLength() external view returns (uint256) {
        MarketPlaceStorage storage mStore = LibMarketplace.applicationStorage();

        return mStore.collections.length;
    }

    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
}
