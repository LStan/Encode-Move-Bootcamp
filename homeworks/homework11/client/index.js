import { requestSuiFromFaucetV0, getFaucetHost } from "@mysten/sui.js/faucet";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { MIST_PER_SUI } from "@mysten/sui.js/utils";

const MY_ADDRESS =
  "0x3d87a280d0b0b468e96836834950c6684a64a425c476a6ba20e7494c635ff0f3";

// create a new SuiClient object pointing to the network you want to use
const suiClient = new SuiClient({ url: getFullnodeUrl("devnet") });

// Convert MIST to Sui
const balance = (balance) => {
  return Number.parseInt(balance.totalBalance) / Number(MIST_PER_SUI);
};

// store the JSON representation for the SUI the address owns before using faucet
const suiBefore = await suiClient.getBalance({
  owner: MY_ADDRESS,
});

await requestSuiFromFaucetV0({
  // use getFaucetHost to make sure you're using correct faucet address
  // you can also just use the address (see Sui Typescript SDK Quick Start for values)
  host: getFaucetHost("devnet"),
  recipient: MY_ADDRESS,
});

// store the JSON representation for the SUI the address owns after using faucet
const suiAfter = await suiClient.getBalance({
  owner: MY_ADDRESS,
});

// Output result to console.
console.log(
  `Balance before faucet: ${balance(suiBefore)} SUI. Balance after: ${balance(
    suiAfter
  )} SUI. Hello, Bootcamp !`
);
