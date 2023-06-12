import { ethers } from "hardhat";
import { Interview__factory } from "../../typechain-types";

async function main() {
  console.log("👟 Start to deploy interview contract");

  // Define contract deployer
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];

  // Deploy contract
  const contract = await new Interview__factory(deployer).deploy();
  await contract.deployed();
  console.log(`✅ Contract deployed to ${contract.address}`);

  // Print contract table id
  const contractTableId = await contract._tableId();
  console.log(`👀 Contract table ID is ${contractTableId}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
