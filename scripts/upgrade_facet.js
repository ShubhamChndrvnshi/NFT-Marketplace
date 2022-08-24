const { getSelectors, FacetCutAction, StorageAction } = require('./libraries/diamond.js');
const GasEstimator = require("./gasEstimator");

task("upgradefacet", "Upgrade facet function of diamond")
  .addParam("facetname", "Facet name")
  .addParam("diamondaddress", "Diamond address")
  .setAction(async (taskArgs, hre) => {
    const gasEstimator = new GasEstimator("polygon");
    const { ethers } = hre;
    const DiamondCutFacet = await ethers.getContractAt('DiamondCutFacet', taskArgs.diamondaddress);
    const Facet = await ethers.getContractFactory(taskArgs.facetname)
    const facet = await Facet.deploy({
      gasPrice: ethers.utils.parseUnits(
          Math.ceil(await gasEstimator.estimate()).toString(),
          "gwei"
      ),
  })
    await facet.deployed()
    console.log(facet.address)

    const tx = await DiamondCutFacet.diamondCut(
      [{
        facetAddress: facet.address,
        facetAction: FacetCutAction.Replace,
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
    console.log("Facet upgrade Tx: ", tx.hash);
  });
module.exports = {};
