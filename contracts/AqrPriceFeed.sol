//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract AqrPriceFeed {
    string private api;

    constructor(string memory _api) {
        console.log("Deploying a Aqr price feed with api:", _api);
        api = _api;
    }

    function getPrice() public pure returns(uint256){
        // (,int256 answer,,,) = maticPriceFeed.latestRoundData();
        int256 answer = 25567675; //maticPriceFeed.latestRoundData();
         return uint256(answer * 10000000000);
    }

    function getConversionRate(uint256 aqrAmount) public pure returns (uint256){
        uint256 price = getPrice(); // 262784346 ;
        uint256 AmountInUsd = (price * aqrAmount) / 1000000000000000000;
        return AmountInUsd;
    }
}
