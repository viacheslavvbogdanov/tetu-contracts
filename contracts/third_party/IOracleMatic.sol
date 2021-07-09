//SPDX-License-Identifier: Unlicense
pragma solidity 0.7.6;

interface IOracleMatic {

  function getPrice(address token) external view returns (uint256);

}