import { useEffect, useState } from "react";
import { useWalletKit } from "@mysten/wallet-kit";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { BCS, getSuiMoveConfig } from "@mysten/bcs";
import { MIST_PER_SUI } from "@mysten/sui.js/utils";

type Gift = {
  address: String;
  amount: number;
  timestamp: number;
};

export default function SentGiftList(props: {
  isTxnInProgress: boolean;
  setTxn: (isTxnInProgress: boolean) => void;
}) {
  const [gifts, setGifts] = useState<Gift[]>([]);

  const { currentAccount, currentWallet, isConnected } = useWalletKit();

  useEffect(() => {
    if (isConnected) {
      getGifts().then((gifts) => {
        setGifts(gifts);
      });
    }
  }, [currentAccount, isConnected, props.isTxnInProgress]);

  const getGifts = async () => {
    if (!currentAccount?.address || !isConnected) {
      return [];
    }

    const suiClient = new SuiClient({ url: getFullnodeUrl("devnet") });

    const txb = new TransactionBlock();
    txb.moveCall({
      target: `${process.env.MODULE_ADDRESS}::${process.env.MODULE_NAME}::view_gifter_gifts`,
      arguments: [
        txb.pure(currentAccount?.address),
        txb.object(`${process.env.STATE_ADDRESS}`),
      ],
    });

    let res = await suiClient.devInspectTransactionBlock({
      transactionBlock: txb,
      sender: currentAccount?.address,
    });

    console.log(res);
    let res2 = res.results?.[0].returnValues || [];
    console.log((res2));
    const bcs = new BCS(getSuiMoveConfig());
    // const array = [1, 2, 3, 4];
    // const ser_array = bcs.ser("vector<u8>", array);
    // console.log(ser_array.toBytes());

    // console.log(res2[0]);
    // console.log(new Uint8Array(res2[0][0]));
    
    
    let gifters = bcs.de("vector<address>", new Uint8Array(res2[0][0]));
    let gift_amounts = bcs.de("vector<u64>", new Uint8Array(res2[1][0]));
    let birthday_timestamp_ms = bcs.de("vector<u64>", new Uint8Array(res2[2][0]));
    
    console.log(gifters);
    console.log(gift_amounts);
    console.log(birthday_timestamp_ms);
    
    // const de_array = bcs.de("vector<u8>", ser_array.toBytes());
    let result: Gift[] = [];
    for (let i = 0; i < gifters.length; i += 1) {
      result.push({
        address: gifters[i],
        amount: Number(gift_amounts[i]) / Number(MIST_PER_SUI),
        timestamp: Number(birthday_timestamp_ms[i]),
      });
    }
    console.log(result);
    
    return result;
  };

  return <></>;
}
