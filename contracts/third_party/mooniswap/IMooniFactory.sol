// SPDX-License-Identifier: Unlicense
pragma solidity 0.7.6;

interface IMooniFactory {
  function isPool(address token) external view returns(bool);
  function getAllPools() external view returns(address[] memory);
  function pools(address tokenA, address tokenB) external view returns(address);
}