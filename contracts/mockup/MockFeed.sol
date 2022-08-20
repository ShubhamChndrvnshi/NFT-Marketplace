// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockFeed {
  uint8 public decimals = 8;

  function latestRoundData()
    external
    pure
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    ){
        return (1, 100000000, 158525105, 158525105, 158525105);
    }
}
