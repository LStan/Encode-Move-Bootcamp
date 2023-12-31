"use client";

import { useState, useEffect } from "react";
import { ConnectButton, useWalletKit } from "@mysten/wallet-kit";
import { Separator } from "@radix-ui/react-separator";
import GiftCreator from "./GiftCreator";
import GiftList from "./GiftList";
import ThemeToggle from "@/components/ThemeToggle";
import { CoinBalance, SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { MIST_PER_SUI, formatAddress } from "@mysten/sui.js/utils";

export default function Home() {
  const { currentAccount, isConnected } = useWalletKit();
  const [txnInProgress, setTxnInProgress] = useState(false);
  const [balance, setBalance] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isConnected && currentAccount) {
      getBalance(currentAccount.address);
    }
  }, [isConnected, currentAccount, txnInProgress]);

  const getBalance = async (address: string) => {
    const suiClient = new SuiClient({ url: getFullnodeUrl("devnet") });

    let suiBalance: CoinBalance;
    try {
      suiBalance = await suiClient.getBalance({
        owner: address,
      });
    } catch (e) {
      setBalance("0");
      return;
    }

    setBalance(
      (
        Number.parseInt(suiBalance.totalBalance) / Number(MIST_PER_SUI)
      ).toLocaleString()
    );
  };

  return (
    <div className="min-h-screen h-full w-full max-w-screen flex flex-col items-center dark:bg-slate-950">
      <div className="flex w-full max-w-screen-2xl lg:flex-row flex-col justify-between items-center my-2 px-40">
        <h2 className="text-3xl font-semibold transition-colors">
          Birthday Gifts
        </h2>
        <div className="flex flex-row justify-around gap-2 items-center">
          <ThemeToggle />

          <ConnectButton connectedText={`${balance} SUI | ${formatAddress(currentAccount?.address || "")}`}/>
        </div>
      </div>
      <Separator className="bg-slate-200 dark:bg-slate-800 h-[1px] w-full" />
      <div className="my-6">
        <div className="flex flex-col items-center">
          <h1 className="text-4xl font-extrabold transition-colors">
            The Birthday Gifts
          </h1>
          <p className="w-10/12 mt-6">
            An automated and on-chain gift giving platform. Use this platform to
            create gifts that hold SUI tokens that can be opened by the
            recipient on their birthday.
          </p>
        </div>
      </div>
      {isConnected && currentAccount?.chains[0] == "sui:devnet" && (
        <div className="h-full w-full flex lg:flex-row flex-col items-center justify-center gap-20 my-4 grow">
          <GiftCreator
            setTxn={setTxnInProgress}
            isTxnInProgress={txnInProgress}
          />
          <GiftList setTxn={setTxnInProgress} isTxnInProgress={txnInProgress} />
        </div>
      )}
    </div>
  );
}
