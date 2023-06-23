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
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" fill="none" xmlns:v="https://vecta.io/nano"><path fill="#eee" d="M0 0h256v256H0z"/><path d="M110.036 140.54c-2.736 0-5.148-.528-7.236-1.584-2.064-1.056-3.66-2.568-4.788-4.536-1.128-1.992-1.692-4.32-1.692-6.984s.564-4.98 1.692-6.948c1.128-1.992 2.724-3.516 4.788-4.572 2.088-1.08 4.5-1.62 7.236-1.62 1.8 0 3.408.18 4.824.54s2.724.924 3.924 1.692v6.048c-1.056-.84-2.256-1.452-3.6-1.836-1.32-.384-2.844-.576-4.572-.576-2.472 0-4.38.648-5.724 1.944-1.344 1.272-2.016 3.048-2.016 5.328s.672 4.068 2.016 5.364c1.368 1.296 3.276 1.944 5.724 1.944 1.728 0 3.276-.204 4.644-.612a11.97 11.97 0 0 0 3.816-1.944v6.012c-2.28 1.56-5.292 2.34-9.036 2.34zm11.543-25.704h6.12l7.272 15.588 7.308-15.588h6.084V140h-5.94v-12.636L136.411 140h-2.88l-5.976-12.636V140h-5.976v-25.164zm30.023 0h6.372V140h-6.372v-25.164z" fill="#000"/></svg>'
  );
  console.log(`✅ Image SVG is set`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
