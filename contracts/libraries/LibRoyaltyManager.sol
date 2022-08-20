// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {IERC20} from "../util/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

library LibRoyaltyManager {
    using Address for address;

    bytes4 constant INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 constant INTERFACE_ID_ERC1155 = 0xd9b67a26;
    bytes4 constant _INTERFACE_ID_ERC2981 = 0x2a55205a;

    /// @notice Transfers royalties to the rightsowner if applicable
    /// @param nft - the address of NFT
    /// @param tokenId - the NFT assed queried for royalties
    /// @param grossSaleValue - the price at which the asset will be sold
    /// @param _paytoken - the address of payment token
    /// @return netSaleAmount - the value that will go to the seller after
    ///         deducting royalties
    function _deduceRoyalties(
        address nft,
        uint256 tokenId,
        uint256 grossSaleValue,
        address _paytoken
    ) internal returns (uint256 netSaleAmount, uint256 royaltyAmount) {
        // Get amount of royalties to pays and recipient
        (address royaltiesReceiver, uint256 royaltiesAmount) = IERC2981(nft)
            .royaltyInfo(tokenId, grossSaleValue);
        // Deduce royalties from sale value
        uint256 netSaleValue = grossSaleValue - royaltiesAmount;
        // Transfer royalties to rightholder if not zero
        if (royaltiesAmount > 0) {
            if (_paytoken == address(0)) {
                Address.sendValue(payable(royaltiesReceiver), royaltiesAmount);
            } else {
                IERC20(_paytoken).transfer(royaltiesReceiver, royaltiesAmount);
            }
        }
        return (netSaleValue, royaltiesAmount);
    }

    /// @notice Checks if NFT contract implements the ERC-2981 interface
    /// @param _contract - the address of the NFT contract to query
    /// @return true if ERC-2981 interface is supported, false otherwise
    function _checkRoyalties(address _contract) internal view returns (bool) {
        bool success = IERC2981(_contract).supportsInterface(
            _INTERFACE_ID_ERC2981
        );
        return success;
    }
}
