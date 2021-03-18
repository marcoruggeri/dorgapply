require("dotenv").config();
const fetch = require("node-fetch");
const { ethers } = require("ethers");
const { abiBalancer } = require("./abi/abiBalancer");
const { abiCover } = require("./abi/abiCover");
const { abiArts } = require("./abi/abiArts");

let eth = 2000;
let gasPrice = 200;

let timeout = 0;

const log4js = require("log4js");
log4js.configure({
  appenders: { cheese: { type: "file", filename: "cheese2.log" } },
  categories: { default: { appenders: ["cheese"], level: "error" } },
});
const logger = log4js.getLogger("cheese");

const provider = new ethers.providers.JsonRpcProvider("http://localhost:8547");

const wallet = new ethers.Wallet(process.env.PK, provider);

const arts = new ethers.Contract(process.env.ARBS_CONTRACT, abiArts, wallet);

const balancerPool = new ethers.Contract(
  "0xe093973b45d3ddfc7d789850ad5b5bbd6a59846f",
  abiBalancer,
  wallet
);

const ALOT = ethers.utils.parseEther("100000");

const calcBuy = async (data, amount) => {
  try {
    const tx = await arts.calcArbyBuy(
      data.protocolAddress,
      data.claimPool,
      data.noClaimPool,
      data.expiration,
      ethers.utils.parseEther(amount),
      data.poolCollateral,
      data.collateral
    );
    return parseFloat(amount) - parseFloat(ethers.utils.formatEther(tx));
  } catch (error) {
    console.log(error);
  }
};

const calcSell = async (data, amount) => {
  const tx = await arts.calcArbySell(
    data.protocolAddress,
    data.claimPool,
    data.noClaimPool,
    data.expiration,
    ethers.utils.parseEther(amount),
    data.poolCollateral,
    data.collateral
  );
  return parseFloat(ethers.utils.formatEther(tx) - parseFloat(amount));
};

const buyToken = async (data) => {
  let contract;
  try {
    if (data.isClaim) {
      contract = new ethers.Contract(data.claimPool, abiBalancer, wallet);
    } else {
      contract = new ethers.Contract(data.noClaimPool, abiBalancer, wallet);
    }
    const tx = contract.swapExactAmountOut(
      "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      data.maxAmountIn,
      data.covToken,
      data.amount,
      ALOT,
      { gasPrice: data.gas }
    );
    return tx;
  } catch (error) {
    console.log("buyToken", error.message);
    logger.error(error.message);
  }
};

const redeemCollateral = async (data, amount, gas) => {
  const contract = new ethers.Contract(data.coverAddress, abiCover, wallet);
  try {
    const tx = contract.redeemCollateral(amount, { gasPrice: gas });
    return tx;
  } catch (error) {
    console.log(error.message);
    logger.error(error.message);
  }
};

const arbitrageBuy = async (data, protocol) => {
  let arb = await calcBuy(data, "400");
  if (arb < 4) {
    return;
  }
  console.log(`CALCULATING ARB BUY ${data.name}`);
  // logger.error(`CALCULATING ARB BUY ${data.name}`);
  let bestArb = arb;
  let sum = 9900;
  let holderSum = 400;
  for (let i = 0; i < 19; i++) {
    let arb2 = await calcBuy(data, sum.toString());
    if (arb2 > bestArb) {
      bestArb = arb2;
      holderSum = sum;
    }
    sum -= 500;
  }
  if (bestArb > 25) {
    let add = 0;
    timeout++;
    console.log(`POSITIVE BUY ${data.name}`, Date());
    logger.error(`POSITIVE BUY ${data.name}`);
    if (timeout > 60) {
      clearInterval(data.interval);
      try {
        if (bestArb > 500) {
          add = 100;
        } else if (bestArb > 250) {
          add = 75;
        } else if (bestArb > 100) {
          add = 50;
        } else if (bestArb > 50) {
          add = 35;
        } else {
          add = 25;
        }
        const tx1 = await buyToken({
          maxAmountIn: ethers.utils.parseEther((holderSum / 2).toString()),
          claimPool: data.claimPool,
          covToken: data.covTokenClaim,
          amount: ethers.utils.parseEther(holderSum.toString()),
          gas: ethers.utils.parseUnits((gasPrice + add).toString(), "gwei"),
          isClaim: true,
        });
        const tx2 = await buyToken({
          maxAmountIn: ethers.utils.parseEther((holderSum * 1.2).toString()),
          noClaimPool: data.noClaimPool,
          covToken: data.covTokenNoClaim,
          amount: ethers.utils.parseEther(holderSum.toString()),
          gas: ethers.utils.parseUnits((gasPrice + add).toString(), "gwei"),
          isClaim: false,
        });
        await tx1.wait();
        console.log("tx1", tx1);
        await tx2.wait();
        console.log("tx2", tx2);
        const redeem = await redeemCollateral(
          data,
          ethers.utils.parseEther(holderSum.toString()),
          ethers.utils.parseUnits(gasPrice.toString(), "gwei")
        );
        await redeem.wait();
        console.log("redeemed", redeem);
        data.interval = setInterval(protocol, 1000);
        timeout = 0;
      } catch (error) {
        console.log("arbitrageBuy", error);
        logger.error(error.message);
      }
    }
  }
};

// const calculateTxFee = (estimateGas, gasPrice) => {
//   return parseFloat(estimateGas) * parseFloat(gasPrice) * eth;
// };

// const estimateGasSell = async (data, amount) => {
//   try {
//     const tx = await arts.estimateGas.arbitrageSell(
//       data.protocolAddress,
//       data.claimPool,
//       data.noClaimPool,
//       data.expiration,
//       ethers.utils.parseEther(amount),
//       data.collateral
//     );
//     return tx;
//   } catch (error) {}
// };

const execSell = async (data, amount, gas) => {
  try {
    const tx = await arts.arbitrageSell(
      data.protocolAddress,
      data.claimPool,
      data.noClaimPool,
      data.expiration,
      ethers.utils.parseEther(amount),
      data.collateral,
      { gasPrice: gas, gasLimit: 1000000 }
    );
    return tx;
  } catch (error) {}
};

const arbitrageSell = async (data, protocol) => {
  let arb = await calcSell(data, "400");
  if (arb < 4) {
    return;
  }
  console.log(`CALCULATING ARB SELL ${data.name}`);
  let bestArb = arb;
  let sum = 9900;
  let holderSum = 1000;
  for (let i = 0; i < 19; i++) {
    let arb2 = await calcSell(data, sum.toString());
    if (arb2 > bestArb) {
      bestArb = arb2;
      holderSum = sum;
    }
    sum -= 500;
  }
  // let estimatedGas = await estimateGasSell(data, holderSum.toString());
  // let txFee0 = calculateTxFee(
  //   ethers.utils.formatUnits(estimatedGas),
  //   ethers.utils.parseUnits((gasPrice + 50).toString(), "gwei")
  // );
  // let txFee1 = calculateTxFee(
  //   ethers.utils.formatUnits(estimatedGas),
  //   ethers.utils.parseUnits((gasPrice + 100).toString(), "gwei")
  // );
  // let txFee2 = calculateTxFee(
  //   ethers.utils.formatUnits(estimatedGas),
  //   ethers.utils.parseUnits((gasPrice + 200).toString(), "gwei")
  // );
  if (bestArb > 45) {
    console.log(`POSITIVE SELL ${data.name}`, Date());
    logger.error(`POSITIVE ARB SELL ${data.name}`);
    clearInterval(data.interval);
    const tx = await execSell(
      data,
      holderSum.toString(),
      ethers.utils.parseUnits((gasPrice + 30).toString(), "gwei")
    );
    await tx.wait();
    console.log(`ARBITRAGED SELL ${data.name}`);
    data.interval = setInterval(protocol, 1000);
  }
};

const updateEthPrice = () => {
  fetch(
    "https://api.etherscan.io/api?module=stats&action=ethprice&apikey=AVVZPVKSDDA2JXD8ZWCMF5IRBVRX3RHER9"
  )
    .then((res) => res.json())
    .then((json) => {
      eth = parseFloat(json.result.ethusd);
      console.log("ETH PRICE:", eth);
    });
};

const updateGasPrice = () => {
  fetch(
    "https://ethgasstation.info/api/ethgasAPI.json?api-key=efcd202cf4806d632ca8232bde47918159e6ec96b10213dd38e342f05578"
  )
    .then((res) => res.json())
    .then((json) => {
      gasPrice = parseFloat(json.fastest / 10);
      console.log("GAS PRICE:", gasPrice);
    });
};

const calcSellArt = async (data, amount) => {
  const tx = await arts.calcArbySell(
    data.protocolAddress,
    data.claimPool,
    data.noClaimPool,
    data.expiration,
    ethers.utils.parseEther(amount),
    data.poolCollateral,
    data.collateral
  );
  return parseFloat(ethers.utils.formatEther(tx) / 1.05) - parseFloat(amount);
};

const execSellArt = async (data, amount, gas) => {
  try {
    const tx = await arts.arbitrageSellMulti(
      data.protocolAddress,
      data.claimPool,
      data.noClaimPool,
      data.expiration,
      ethers.utils.parseEther(amount),
      data.poolCollateral,
      data.collateral,
      data.collateral,
      { gasPrice: gas, gasLimit: 1000000 }
    );
    return tx;
  } catch (error) {}
};

const arbitrageSellArt = async (data, protocol) => {
  let arb = await calcSellArt(data, "400");
  if (arb < 4) {
    return;
  }
  console.log(`CALCULATING ARB SELL ${data.name}`);
  let bestArb = arb;
  let sum = 7500;
  let holderSum = 400;
  for (let i = 0; i < 14; i++) {
    let arb2 = await calcSellArt(data, sum.toString());
    if (arb2 > bestArb) {
      bestArb = arb2;
      holderSum = sum;
    }
    sum -= 500;
  }
  // let estimatedGas = await estimateGasSellArt(data, holderSum.toString());
  // let txFee0 = calculateTxFee(
  //   ethers.utils.formatUnits(estimatedGas),
  //   ethers.utils.parseUnits((gasPrice + 75).toString(), "gwei")
  // );
  // let txFee1 = calculateTxFee(
  //   ethers.utils.formatUnits(estimatedGas),
  //   ethers.utils.parseUnits((gasPrice + 150).toString(), "gwei")
  // );
  // let txFee2 = calculateTxFee(
  //   ethers.utils.formatUnits(estimatedGas),
  //   ethers.utils.parseUnits((gasPrice + 250).toString(), "gwei")
  // );
  if (bestArb > 45) {
    console.log(`POSITIVE SELL ${data.name}`, Date());
    logger.error(`POSITIVE ARB SELL ${data.name}`);
    clearInterval(data.interval);
    const tx = await execSellArt(
      data,
      holderSum.toString(),
      ethers.utils.parseUnits((gasPrice + 30).toString(), "gwei")
    );
    await tx.wait();
    console.log(`ARBITRAGED SELL ${data.name}`);
    data.interval = setInterval(protocol, 1000);
  }
};

module.exports = {
  arbitrageBuy,
  arbitrageSell,
  arbitrageSellArt,
  updateEthPrice,
  updateGasPrice,
};
