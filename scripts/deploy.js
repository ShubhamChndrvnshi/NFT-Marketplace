// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { mkdirSync, existsSync, readFileSync, writeFileSync } = require("fs");
const { BigNumber, ethers } = require("ethers");

async function main() {
  mkdirSync("frontend/src/abi", { recursive: true });
  mkdirSync("backend/abi", { recursive: true });

  // deploying address registry
  console.log("Deploying AddressRegistry");
  const AddressRegistry = await hre.ethers.getContractFactory("AqarAddressRegistry");
  const addressRegistry = await AddressRegistry.deploy();
  await addressRegistry.deployed();
  createAbiJSON(addressRegistry,"AddressRegistry");

  // Deploy marketplace
  console.log("Deploying AqarMarketplace");
  const AqarMarketplace = await hre.ethers.getContractFactory("AqarMarketplace");
  const aqarMarketplace = await AqarMarketplace.deploy(addressRegistry.address);
  await aqarMarketplace.deployed();
  createAbiJSON(aqarMarketplace,"AqarMarketplace");

  // Deploy factory contracts
  console.log("Deploying AssetsFactory");
  const AssetsFactory = await hre.ethers.getContractFactory("AssetsFactory");
  const assetsFactory = await AssetsFactory.deploy(addressRegistry.address, BigNumber.from("10000000000000"));
  await assetsFactory.deployed();
  createAbiJSON(assetsFactory,"AssetsFactory");

  // Deploy price feed
  console.log("Deploying AqrPriceFeed");
  const AqrPriceFeed = await hre.ethers.getContractFactory("AqrPriceFeed");
  const aqrPriceFeed = await AqrPriceFeed.deploy("https://localhost:4000");
  await aqrPriceFeed.deployed();
  createAbiJSON(aqrPriceFeed,"AqrPriceFeed");

  // Update address in address registry
  console.log("Updating address of aqarMarketplace");
  await addressRegistry.updateMarketplace(aqarMarketplace.address);
  console.log("Updating address of assetsFactory");
  await addressRegistry.updateAssetsFactory(assetsFactory.address);
  console.log("Updating address of aqrPriceFeed");
  await addressRegistry.updatePriceFeed(aqrPriceFeed.address);
  console.log("Deployed all");

}

function createAbiJSON(artifact, filename){
  const { chainId } = hre.network.config;
  if(existsSync(`${__dirname}/../frontend/src/abi/${filename}.json`)){
    const prevData = JSON.parse(readFileSync(`${__dirname}/../frontend/src/abi/${filename}.json`,"utf8"));
    const data = {
      abi: JSON.parse(artifact.interface.format("json")),
      networks: { ...prevData.networks }
    };
    data.networks[chainId] = { "address": artifact.address };
    writeFileSync(`${__dirname}/../frontend/src/abi/${filename}.json`,JSON.stringify(data));
    writeFileSync(`${__dirname}/../backend/abi/${filename}.json`,JSON.stringify(data));
  } else {
    const data = {
      abi: JSON.parse(artifact.interface.format("json")),
      networks: {}
    };
    data.networks[chainId] = { "address": artifact.address };
    writeFileSync(`${__dirname}/../frontend/src/abi/${filename}.json`,JSON.stringify(data));
    writeFileSync(`${__dirname}/../backend/abi/${filename}.json`,JSON.stringify(data));
  }

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
