//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.5;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface IProtocolFactory {
  function getCovTokenAddress(bytes32 _protocolName, uint48 _timestamp, address _collateral, uint256 _claimNonce, bool _isClaimCovToken) external view returns (address);
}

interface IProtocol {
  function name() external view returns (bytes32);
  function claimNonce() external view returns (uint256);
  function addCover(address _collateral, uint48 _timestamp, uint256 _amount)
    external returns (bool);
}

interface ICover {
  function redeemCollateral(uint256 _amount) external;
}

interface IBalancerPool {
    function swapExactAmountIn(address, uint, address, uint, uint) external returns (uint, uint);
    function swapExactAmountOut(address, uint, address, uint, uint) external returns (uint, uint);
    function calcOutGivenIn(uint, uint, uint, uint, uint, uint) external pure returns (uint);
    function calcInGivenOut(uint, uint, uint, uint, uint, uint) external pure returns (uint);
    function getBalance(address) external view returns (uint);
    function getSwapFee() external view returns (uint);
    function getNormalizedWeight(address) external view returns (uint);
}

interface IyDAI {
  function deposit(uint256 _amount) external;
  function getPricePerFullShare() external view returns (uint);
}

contract Arbs {
  IProtocolFactory public factory;
  address private owner;
  uint256 private basePercent = 2000;
   constructor (IProtocolFactory _factory) {
      factory = _factory;
      owner = msg.sender;
    }

  modifier onlyOwner() {
        require(owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }

  function withdraw() public onlyOwner {
    msg.sender.transfer(address(this).balance);
  }

  function withdrawErc20(IERC20 token) public onlyOwner {
    token.transfer(msg.sender, token.balanceOf(address(this)));
  }

  function changeBP(uint256 _basePercent) public onlyOwner {
    basePercent = _basePercent;
  }

  function arbitrageBuyMulti(IProtocol _protocol, ICover _cover, IBalancerPool _claimPool, IBalancerPool _noclaimPool, uint48 _expiration, uint256 _collateralAmount, address _poolCollateral, address _collateral, IyDAI _yDAI) external {
      IERC20(_poolCollateral).transferFrom(msg.sender, address(this), _collateralAmount);
      if (IERC20(_poolCollateral).allowance(address(this), address(_protocol)) < _collateralAmount) {
        IERC20(_poolCollateral).approve(address(_protocol), uint256(-1));
      }

      address noclaimTokenAddr = factory.getCovTokenAddress(_protocol.name(), _expiration, _collateral, _protocol.claimNonce(), false);
      address claimTokenAddr = factory.getCovTokenAddress(_protocol.name(), _expiration, _collateral, _protocol.claimNonce(), true);

      _swapCollateralForToken(_noclaimPool, IERC20(noclaimTokenAddr), _collateralAmount, IERC20(_poolCollateral));
      _swapCollateralForToken(_claimPool, IERC20(claimTokenAddr), _collateralAmount, IERC20(_poolCollateral));

      _cover.redeemCollateral(_collateralAmount);

      uint256 bal = IERC20(_poolCollateral).balanceOf(address(this));
        if(IERC20(_poolCollateral).allowance(_collateral, address(this)) < 100000 ether) {
        IERC20(_poolCollateral).approve(_collateral, uint256(-1));
      }
      _yDAI.deposit(bal);
      uint256 bal2 = IERC20(_collateral).balanceOf(address(this));
      require(bal2 > _collateralAmount, "No arbys");
      uint256 fee = (bal2 * basePercent) / 10000;
      uint256 res = bal2 - fee;
      require(IERC20(_collateral).transfer(msg.sender, res), "ERR_TRANSFER_FAILED");
    }

  function arbitrageSellMulti(IProtocol _protocol, IBalancerPool _claimPool, IBalancerPool _noclaimPool, uint48 _expiration, uint256 _collateralAmount, address _poolCollateral, address _collateral, IyDAI _yDAI) external {
      IERC20(_collateral).transferFrom(msg.sender, address(this), _collateralAmount);
       if (IERC20(_collateral).allowance(address(this), address(_protocol)) < _collateralAmount) {
        IERC20(_collateral).approve(address(_protocol), uint256(-1));
      }
      _protocol.addCover(_collateral, _expiration, _collateralAmount);
      address noclaimTokenAddr = factory.getCovTokenAddress(_protocol.name(), _expiration, _collateral, _protocol.claimNonce(), false);
      address claimTokenAddr = factory.getCovTokenAddress(_protocol.name(), _expiration, _collateral, _protocol.claimNonce(), true);

      _swapTokenForCollateral(_noclaimPool, IERC20(noclaimTokenAddr), _collateralAmount, IERC20(_poolCollateral));
      _swapTokenForCollateral(_claimPool, IERC20(claimTokenAddr), _collateralAmount, IERC20(_poolCollateral));

      uint256 bal = IERC20(_poolCollateral).balanceOf(address(this));
      if(IERC20(_poolCollateral).allowance(_collateral, address(this)) < 100000 ether) {
        IERC20(_poolCollateral).approve(_collateral, uint256(-1));
      }
      _yDAI.deposit(bal);
      uint256 bal2 = IERC20(_collateral).balanceOf(address(this));
      require(bal2 > _collateralAmount, "No arbys");
      uint256 fee = (bal2 * basePercent) / 10000;
      uint256 res = bal2 - fee;
      require(IERC20(_collateral).transfer(msg.sender, res), "ERR_TRANSFER_FAILED");
    }

    function arbitrageBuy(IProtocol _protocol, ICover _cover, IBalancerPool _claimPool, IBalancerPool _noclaimPool, uint48 _expiration, uint256 _collateralAmount, address _collateral) external {
      IERC20(_collateral).transferFrom(msg.sender, address(this), _collateralAmount);
      if (IERC20(_collateral).allowance(address(this), address(_protocol)) < _collateralAmount) {
        IERC20(_collateral).approve(address(_protocol), uint256(-1));
      }

      address noclaimTokenAddr = factory.getCovTokenAddress(_protocol.name(), _expiration, _collateral, _protocol.claimNonce(), false);
      address claimTokenAddr = factory.getCovTokenAddress(_protocol.name(), _expiration, _collateral, _protocol.claimNonce(), true);

      _swapCollateralForToken(_noclaimPool, IERC20(noclaimTokenAddr), _collateralAmount, IERC20(_collateral));
      _swapCollateralForToken(_claimPool, IERC20(claimTokenAddr), _collateralAmount, IERC20(_collateral));

      _cover.redeemCollateral(_collateralAmount);

      uint256 bal = IERC20(_collateral).balanceOf(address(this));
      require(bal > _collateralAmount, "No arbys");
      uint256 fee = (bal * basePercent) / 10000;
      uint256 res = bal - fee;
      require(IERC20(_collateral).transfer(msg.sender, res), "ERR_TRANSFER_FAILED");
    }

    function arbitrageSell(IProtocol _protocol, IBalancerPool _claimPool, IBalancerPool _noclaimPool, uint48 _expiration, uint256 _collateralAmount, address _collateral) external {
      IERC20(_collateral).transferFrom(msg.sender, address(this), _collateralAmount);
      if (IERC20(_collateral).allowance(address(this), address(_protocol)) < _collateralAmount) {
        IERC20(_collateral).approve(address(_protocol), uint256(-1));
      }
      _protocol.addCover(_collateral, _expiration, _collateralAmount);

      address noclaimTokenAddr = factory.getCovTokenAddress(_protocol.name(), _expiration, _collateral, _protocol.claimNonce(), false);
      address claimTokenAddr = factory.getCovTokenAddress(_protocol.name(), _expiration, _collateral, _protocol.claimNonce(), true);

      _swapTokenForCollateral(_noclaimPool, IERC20(noclaimTokenAddr), _collateralAmount, IERC20(_collateral));
      _swapTokenForCollateral(_claimPool, IERC20(claimTokenAddr), _collateralAmount, IERC20(_collateral));

      uint256 bal = IERC20(_collateral).balanceOf(address(this));
      require(bal > _collateralAmount, "No arbys");
      uint256 fee = (bal * basePercent) / 10000;
      uint256 res = bal - fee;
      require(IERC20(_collateral).transfer(msg.sender, res), "ERR_TRANSFER_FAILED");
    }

    function _swapTokenForCollateral(IBalancerPool _bPool, IERC20 _token, uint256 _sellAmount, IERC20 _collateral) private {
        if (_token.allowance(address(this), address(_bPool)) < _sellAmount) {
          _token.approve(address(_bPool), uint256(-1));
        }
        IBalancerPool(_bPool).swapExactAmountIn(
            address(_token),
            _sellAmount,
            address(_collateral),
            0, // minAmountOut, set to 0 -> sell no matter how low the price of CLAIM tokens are
            uint256(-1) // maxPrice, set to max -> accept any swap prices
        );
    }

    function _swapCollateralForToken(IBalancerPool _bPool, IERC20 _token, uint256 _buyAmount, IERC20 _collateral) private {
        if (_collateral.allowance(address(this), address(_bPool)) < _buyAmount) {
          _collateral.approve(address(_bPool), uint256(-1));
        }
        IBalancerPool(_bPool).swapExactAmountOut(
            address(_collateral),
            uint256(-1), // maxAmountIn, set to max -> use all sent DAI
            address(_token),
            _buyAmount,
            uint256(-1) // maxPrice, set to max -> accept any swap prices
            );
    }

     function calcArbySell(IProtocol _protocol, IBalancerPool _claimPool, IBalancerPool _noclaimPool, uint48 _expiration, uint256 _sellAmount,address _poolCollateral, address _collateral) external view returns(uint256) {
      address claimTokenAddr = factory.getCovTokenAddress(_protocol.name(), _expiration, _collateral, _protocol.claimNonce(), true);
      address noclaimTokenAddr = factory.getCovTokenAddress(_protocol.name(), _expiration, _collateral, _protocol.claimNonce(), false);

      uint256 collateralFromSellingClaim = _daiFromSellingCov(_claimPool, claimTokenAddr, _poolCollateral, _sellAmount);
      uint256 daiFromSellingNoClaim = _daiFromSellingCov(_noclaimPool,noclaimTokenAddr,_poolCollateral,_sellAmount);

      return (collateralFromSellingClaim + daiFromSellingNoClaim);
    }

    function calcArbyBuy(IProtocol _protocol, IBalancerPool _claimPool, IBalancerPool _noclaimPool, uint48 _expiration, uint256 _buyAmount, address _poolCollateral, address _collateral) public view returns(uint256) {
      address claimTokenAddr = factory.getCovTokenAddress(_protocol.name(), _expiration, _collateral, _protocol.claimNonce(), true);
      address noclaimTokenAddr = factory.getCovTokenAddress(_protocol.name(), _expiration, _collateral, _protocol.claimNonce(), false);

      uint256 collateralCostClaim = _daiToPayForCov(_claimPool, claimTokenAddr, _poolCollateral, _buyAmount);
      uint256 collateralCostNoClaim = _daiToPayForCov(_noclaimPool, noclaimTokenAddr, _poolCollateral, _buyAmount);

      return (collateralCostClaim + collateralCostNoClaim);
    }

    function _daiFromSellingCov(IBalancerPool _covPool, address _covTokenAddr, address _poolCollateral, uint256 _sellAmount) private view returns(uint256) {
      uint256 result = IBalancerPool(_covPool).calcOutGivenIn(
        IBalancerPool(_covPool).getBalance(_covTokenAddr),
        IBalancerPool(_covPool).getNormalizedWeight(_covTokenAddr),
        IBalancerPool(_covPool).getBalance(_poolCollateral),
        IBalancerPool(_covPool).getNormalizedWeight(_poolCollateral),
        _sellAmount,
        IBalancerPool(_covPool).getSwapFee());
      return result;
    }
    function _daiToPayForCov(IBalancerPool _covPool, address _covTokenAddr, address _poolCollateral, uint256 _buyAmount) private view returns(uint256) {
       uint256 result = IBalancerPool(_covPool).calcInGivenOut(
        IBalancerPool(_covPool).getBalance(_poolCollateral),
        IBalancerPool(_covPool).getNormalizedWeight(_poolCollateral),
        IBalancerPool(_covPool).getBalance(_covTokenAddr),
        IBalancerPool(_covPool).getNormalizedWeight(_covTokenAddr),
        _buyAmount,
        IBalancerPool(_covPool).getSwapFee());
        return result;
    }
    receive() external payable {}
}