//SPDX-License-Identifier: Unlicense
pragma solidity 0.7.6;

import "../../../base/strategies/snx-base/SNXStrategyFullBuyback.sol";
import "../../../third_party/quick/IStakingRewards.sol";
import "../../../third_party/uniswap/IUniswapV2Pair.sol";

contract StrategyQuick_QUICK_GAME is SNXStrategyFullBuyback {

  // QUICK_QUICK_GAME
  address private constant UNDERLYING = address(0x6276969983510b3DfAE28fE6b7b8e2A858F0c2bd);
  // QUICK
  address private constant TOKEN0 = address(0x831753DD7087CaC61aB5644b308642cc1c33Dc13);
  // GAME
  address private constant TOKEN1 = address(0x8d1566569d5b695d44a9a234540f68D393cDC40D);
  address private constant QUICK_REWARD_POOL = address(0x8FC0a8dE57d15dF22238FCd165Cd5d6658ac4788);

  string private constant _PLATFORM = "QUICK";
  address private constant QUICK_REWARD_TOKEN = address(0x831753DD7087CaC61aB5644b308642cc1c33Dc13);
  address[] private quickPoolRewards = [QUICK_REWARD_TOKEN];
  address[] private _assets = [TOKEN0, TOKEN1];

  constructor(
    address _controller,
    address _vault
  ) SNXStrategyFullBuyback(_controller, UNDERLYING, _vault, quickPoolRewards, QUICK_REWARD_POOL) {
    require(address(IStakingRewards(QUICK_REWARD_POOL).stakingToken()) == UNDERLYING, "wrong pool");
    address token0 = IUniswapV2Pair(UNDERLYING).token0();
    address token1 = IUniswapV2Pair(UNDERLYING).token1();
    require(TOKEN0 != TOKEN1, "same tokens");
    require(TOKEN0 == token0 || TOKEN0 == token1, "wrong token0");
    require(TOKEN1 == token0 || TOKEN1 == token1, "wrong token1");

  }

  function platform() external override pure returns (string memory) {
    return _PLATFORM;
  }

  // assets should reflect underlying tokens for investing
  function assets() external override view returns (address[] memory) {
    return _assets;
  }
}