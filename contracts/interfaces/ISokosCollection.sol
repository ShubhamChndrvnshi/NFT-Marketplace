// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

interface ISokosCollection is IERC1155 {
    function mint(
        uint256 supply, 
        bytes memory metaDataURI, 
        address payable _royaltiesRecipientAddress, 
        uint96 _percentageBasisPoints
        ) external returns (uint);
}