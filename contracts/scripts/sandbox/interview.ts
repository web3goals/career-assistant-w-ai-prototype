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

  // const tableId = await interviewContract._tableId();
  // console.log("👀 tableId", tableId);

  // const startTx = await interviewContract.start("solidity");
  // console.log("👀 startTx", startTx);
  // await startTx.wait();

  // const balanceOf = await interviewContract.balanceOf(account.address);
  // console.log("👀 balanceOf", balanceOf);

  // const saveMessagesTx = await interviewContract.saveMessages(
  //   1,
  //   [1686586355],
  //   ["Hello world!"],
  //   [1]
  // );
  // console.log("👀 saveMessagesTx", saveMessagesTx);
  // await saveMessagesTx.wait();

  // const tokenURI = await interviewContract.tokenURI(1);
  // console.log("👀 tokenURI", tokenURI);

  console.log("🏁 Sandbox is finished");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
