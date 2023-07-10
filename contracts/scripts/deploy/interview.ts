import { ethers } from "hardhat";
import { Interview__factory } from "../../typechain-types/factories/contracts/Interview__factory";

async function main() {
  console.log("👟 Start to deploy interview contract");

  // Define contract deployer
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];

  // Deploy contract
  const contract = await new Interview__factory(deployer).deploy();
  await contract.deployed();
  console.log(`✅ Contract deployed to ${contract.address}`);

  // Set image SVG
  await contract.setImageSVG(
    '<svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="256" height="256" fill="#EEEEEE"/><path d="M110.907 140.54C108.171 140.54 105.759 140.012 103.671 138.956C101.607 137.9 100.011 136.388 98.883 134.42C97.755 132.428 97.191 130.1 97.191 127.436C97.191 124.772 97.755 122.456 98.883 120.488C100.011 118.496 101.607 116.972 103.671 115.916C105.759 114.836 108.171 114.296 110.907 114.296C112.707 114.296 114.315 114.476 115.731 114.836C117.147 115.196 118.455 115.76 119.655 116.528V122.576C118.599 121.736 117.399 121.124 116.055 120.74C114.735 120.356 113.211 120.164 111.483 120.164C109.011 120.164 107.103 120.812 105.759 122.108C104.415 123.38 103.743 125.156 103.743 127.436C103.743 129.716 104.415 131.504 105.759 132.8C107.127 134.096 109.035 134.744 111.483 134.744C113.211 134.744 114.759 134.54 116.127 134.132C117.495 133.724 118.767 133.076 119.943 132.188V138.2C117.663 139.76 114.651 140.54 110.907 140.54ZM130.896 114.836H137.16L147.204 140H140.688L138.672 134.816H129.384L127.368 140H120.816L130.896 114.836ZM137.088 129.92L134.028 121.46L130.932 129.92H137.088ZM149.731 114.836H156.103V140H149.731V114.836Z" fill="black"/></svg>'
  );
  console.log(`✅ Image SVG is set`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
