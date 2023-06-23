import { ethers } from "hardhat";
import { Interview__factory } from "../../typechain-types";

async function main() {
  console.log("👟 Start sandbox");

  // Define account
  const accounts = await ethers.getSigners();
  const account = accounts[0];

  // Define interview contract
  const interviewContractAddress = "";
  const interviewContract = new Interview__factory(account).attach(
    interviewContractAddress
  );

  // const startTx = await interviewContract.start("sandbox");
  // console.log("👀 startTx", startTx);
  // await startTx.wait();

  // const balanceOf = await interviewContract.balanceOf(account.address);
  // console.log("👀 balanceOf", balanceOf);

  // const tokenURI = await interviewContract.tokenURI(1);
  // console.log("👀 tokenURI", tokenURI);

  console.log("🏁 Sandbox is finished");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
