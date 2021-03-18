const {
  arbitrageBuy,
  arbitrageSell,
  // arbitrageBuyArt,
  arbitrageSellArt,
  updateEthPrice,
  updateGasPrice,
} = require("./newFuncs");

let fraxInterval;
let basisInterval;
let coreInterval;
let boringInterval;

const fraxData = {
  name: "FRAX",
  protocolAddress: "0xEccA409A100DCDA18E8D3212CB489DC537464a3C",
  coverAddress: "0x85fF47CCbF527bb7960b8343E61130e879AAbE4e",
  claimPool: "0x4b2a6951Cf2C9B1F391C219A977E4Cd2f8987cba",
  covTokenClaim: "0xd6be8d19d0db7a7ac6e8bbba316f21520c7b3546",
  noClaimPool: "0xD833716aFA81CDa00B33e138689f7A01D8c47B8c",
  covTokenNoClaim: "0xf5af9d78c35c77c8fbae4d232bcfecaad3c233f3",
  expiration: 1614470400,
  collateral: "0x16de59092dAE5CcF4A1E6439D611fd0653f0Bd01",
  poolCollateral: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  interval: fraxInterval,
};

const basisData = {
  name: "BASIS",
  protocolAddress: "0x3c9089A293a3e41d1603FB2407041fC060091C3A",
  coverAddress: "0xCE86765EE66f37112a81445867729EbD311c7074",
  claimPool: "0x59c0190823276c5ab9d8d41b291efd1defce168a",
  covTokenClaim: "0x41764099426529966df42C4010a3863cC87aeb07",
  noClaimPool: "0x1a38ea1ca878cd2734aef22f6615e7c6e28de859",
  covTokenNoClaim: "0xee8c737b5764961F871C8fA45cAcad9Eb0e9F8Be",
  expiration: 1609372800,
  collateral: "0x16de59092dAE5CcF4A1E6439D611fd0653f0Bd01",
  poolCollateral: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  interval: basisInterval,
};

const coreData = {
  name: "CORE",
  protocolAddress: "0x1F8326d5DC9664210B46800229858eE63784BF19",
  coverAddress: "0xC6EEE295335EC3BEa93b08D5C8568cc014426436",
  claimPool: "0xA9D06F185f300C57fA54dc71678b225E4ce89407",
  covTokenClaim: "0x07AB6390bC4f105Dd2Ac24A7Cb1Dce9b3ec5c6AF",
  noClaimPool: "0xf677ed557D321A225aEd0f17E295146bb73a3c5B",
  covTokenNoClaim: "0x352e4bbdda1ed839ac07533ed9eebadc39a70963",
  expiration: 1614470400,
  collateral: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  poolCollateral: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  interval: coreInterval,
};

const boringData = {
  name: "BORING",
  protocolAddress: "0xCe723c9f1ea082dEc5a928359005d61CC1446438",
  coverAddress: "0x6b7c64C4eACAabeE1Ed92c8a273363CeA0bE98DD",
  claimPool: "0x68f281072429dc9fe5929637015f4942b969cd41",
  covTokenClaim: "0xdE2dD10DCfc298827E794f64fc3AE4FBcB3e19f3",
  noClaimPool: "0x9a13fe8e0842124187c4f00b2b31e070e6cbb9ff",
  covTokenNoClaim: "0xCf07606fb097612F8e2bea9Fb244de75208c8aa3",
  expiration: 1609372800,
  collateral: "0x16de59092dAE5CcF4A1E6439D611fd0653f0Bd01",
  poolCollateral: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  interval: boringInterval,
};

const frax = () => {
  console.log("running frax", Date());
  arbitrageBuy(fraxData, frax);
  arbitrageSellArt(fraxData, frax);
};

const basis = () => {
  console.log("running basis", Date());
  arbitrageBuy(basisData, basis);
  arbitrageSellArt(basisData, basis);
};

const core = () => {
  console.log("running core", Date());
  arbitrageBuy(coreData, core);
  arbitrageSell(coreData, core);
};

const boring = () => {
  console.log("running boring", Date());
  arbitrageBuy(boringData, boring);
  arbitrageSellArt(boringData, boring);
};

fraxData.interval = setInterval(frax, 1000);
basisData.interval = setInterval(basis, 1000);
coreData.interval = setInterval(core, 1000);
boringData.interval = setInterval(boring, 1000);
setInterval(updateEthPrice, 30000);
setInterval(updateGasPrice, 30000);
