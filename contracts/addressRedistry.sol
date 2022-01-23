// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AqarAddressRegistry is Ownable {
    // bytes4 private constant INTERFACE_ID_ERC721 = 0x80ac58cd;

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
    {
        sokosSportsFactory = _factory;
    }

    /**
     @notice Update Sokos Characters Factory contract
     @dev Only admin
     */
    function updateAssetsFactory(address _factory) external onlyOwner {
        assetsFactory = _factory;
    }

    /**
     @notice Update price feed contract
     @dev Only admin
     */
    function updatePriceFeed(address _priceFeed) external onlyOwner {
        aqrPriceFeed = _priceFeed;
    }
}
