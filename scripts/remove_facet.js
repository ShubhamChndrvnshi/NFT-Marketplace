const { getSelectors, FacetCutAction, StorageAction } = require('./libraries/diamond.js');
const GasEstimator = require("./gasEstimator");

task("removefacets", "Adds one or more facets to diamond")
  .addParam("facetname", "Facet name")
  .addParam("diamondaddress", "Diamond address")
  .setAction(async (taskArgs, hre) => {
        const gasEstimator = new GasEstimator("polygon");
        const { ethers } = hre;

    // const wallet = new ethers.Wallet(process.env.PRIV_KEY, new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545/"))

    const DiamondCutFacet = await ethers.getContractAt('DiamondCutFacet', taskArgs.diamondaddress);
    const Facet = await ethers.getContractFactory(taskArgs.facetname)
    // const facet = await testFacet1.deploy()
    // await facet.deployed()

    const tx = await DiamondCutFacet
    // .connect(wallet)
    .diamondCut(
      [{
        facetAddress: ethers.constants.AddressZero,
        facetAction: FacetCutAction.Remove,
        storageAction: StorageAction.None,
        deprecatedFacetAddress: ethers.constants.AddressZero,
        functionSelectors: getSelectors(Facet)
      }], ethers.constants.AddressZero, "0x", {
        gasPrice: ethers.utils.parseUnits(
            Math.ceil(await gasEstimator.estimate()).toString(),
            "gwei"
        ),
    });
    await tx.wait();
    console.log("Facet remove Tx: ", tx.hash);
  });
module.exports = {};
