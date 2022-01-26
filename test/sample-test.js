const { expect } = require("chai");
const { ethers } = require("hardhat");
const addressRegistry = require("../backend/abi/AddressRegistry.json")
const Web3 = require("web3");

describe("AddressRegistry", function () {
  it("Should print address registry assets address", async function () {
    const addressContract =  getAddressRegistryContract();
    console.log("addressContract",await addressContract.marketplace())
  });
});

const getAddressRegistryContract = () => {
  const provider = new ethers.providers.JsonRpcProvider("https://nd-462-884-459.p2pify.com/70eaca77551eac07163154a14c5e9432");
  const address = "0x8ba1f109551bD432803012645Ac136ddd64DBA72"
  const signer = new ethers.VoidSigner(address, provider)
  const addressRegistryContract = new ethers.Contract(
    addressRegistry.networks[80001].address,
    addressRegistry.abi,
    signer
  );
  return addressRegistryContract;
};
    