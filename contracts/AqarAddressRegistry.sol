// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AqarAddressRegistry is Ownable {
    bytes4 private constant INTERFACE_ID_ERC1155 = 0xd9b67a26;

    /// @notice Aqarchain Marketplace contract
    address public marketplace;

    /// @notice Aqarchain Marketplace contract
    address public prevMarketplace;

    /// @notice Aqarchain Characters Factory contract
    address public assetsFactory;

    /// @notice Aqarchain Sports Factory contract
    address public sokosSportsFactory;

    /// @notice SokosPriceFeed contract
    address public aqrPriceFeed;

    /**
     @notice Update SokosMarketplace contract
     @dev Only admin
     */
    function updateMarketplace(address _marketplace) external onlyOwner {
        marketplace = _marketplace;
    }

    /**
     @notice Update SokosMarketplace contract
     @dev Only admin
     */
    function updatePrevMarketplace(address _marketplace) external onlyOwner {
        prevMarketplace = _marketplace;
    }

    /**
     @notice Update Sokos Sports NFT contract
     @dev Only admin
     */
    function updateSportsFactory(address _factory)
        external
        onlyOwner
        isERC1155(_factory)
    {
        sokosSportsFactory = _factory;
    }

    /**
     @notice Update Sokos Characters Factory contract
     @dev Only admin
     */
    function updateAssetsFactory(address _factory) 
        external 
        onlyOwner 
        isERC1155(_factory) {
        assetsFactory = _factory;
    }

    /**
     @notice Update price feed contract
     @dev Only admin
     */
    function updatePriceFeed(address _priceFeed) external onlyOwner {
        aqrPriceFeed = _priceFeed;
    }

    function isAqrNFT(address _nft) external view returns(bool){
        if((_nft == assetsFactory) || (_nft == sokosSportsFactory)){
            return true;
        }
        return false;
    }

     modifier isERC1155(
        address _factory
    ) {
        require(
            IERC165(_factory).supportsInterface(INTERFACE_ID_ERC1155),
            "Not ERC1155"
        );
        _;
    }
}
