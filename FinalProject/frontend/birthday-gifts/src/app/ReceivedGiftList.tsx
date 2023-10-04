import { useEffect, useState } from "react";
import { useWalletKit } from "@mysten/wallet-kit";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { BCS, getSuiMoveConfig } from "@mysten/bcs";
import { MIST_PER_SUI } from "@mysten/sui.js/utils";
import { CardDescription, CardTitle } from "@/components/card";
import { Button } from "@/components/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableCell,
  TableBody,
} from "@/components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/tooltip";
import { ScrollArea } from "@/components/scroll-area";

type Gift = {
  address: string;
  amount: number;
  timestamp: number;
};

export default function ReceivedGiftList(props: {
  isTxnInProgress: boolean;
  setTxn: (isTxnInProgress: boolean) => void;
}) {
  const [gifts, setGifts] = useState<Gift[]>([]);

  const { currentAccount, isConnected, signAndExecuteTransactionBlock } =
    useWalletKit();

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
      target: `${process.env.MODULE_ADDRESS}::${process.env.MODULE_NAME}::view_recipient_gifts`,
      arguments: [
        txb.pure(currentAccount?.address),
        txb.object(`${process.env.STATE_ADDRESS}`),
      ],
    });

    const res = await suiClient.devInspectTransactionBlock({
      transactionBlock: txb,
      sender: currentAccount?.address,
    });

    const res2 = res.results?.[0].returnValues || [];

    const bcs = new BCS(getSuiMoveConfig());

    let gifters = bcs.de("vector<address>", new Uint8Array(res2[0][0]));
    let gift_amounts = bcs.de("vector<u64>", new Uint8Array(res2[1][0]));
    let birthday_timestamp_ms = bcs.de(
      "vector<u64>",
      new Uint8Array(res2[2][0])
    );

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

  const claimGift = async (gifter: string) => {
    props.setTxn(true);

    const txb = new TransactionBlock();
    txb.moveCall({
      target: `${process.env.MODULE_ADDRESS}::${process.env.MODULE_NAME}::claim_birthday_gift`,
      arguments: [
        txb.pure(gifter),
        txb.object(`${process.env.STATE_ADDRESS}`),
        txb.object("0x6"), // clock
      ],
    });

    try {
      console.log(
        await signAndExecuteTransactionBlock({
          transactionBlock: txb,
          options: { showEffects: true },
        })
      );
    } catch (e) {
      console.log(e);
    }

    props.setTxn(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div>
        <CardTitle className="my-2">Gifts sent to you!</CardTitle>
        <CardDescription className="break-normal w-96">
          View and open all of your gifts! You can only open gifts after the
          release time has passed.
        </CardDescription>
      </div>
      <ScrollArea className="border rounded-lg">
        <div className="h-fit max-h-56">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">From</TableHead>
                <TableHead className="text-center">Amount</TableHead>
                <TableHead className="text-center">Release time</TableHead>
                <TableHead className="text-center">Claim</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gifts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <p className="break-normal w-100 text-center">
                      You have no gifts yet.
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {gifts.map((gift, index) => {
                return (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="underline">
                            {gift.address.slice(0, 6)}...
                            {gift.address.slice(-4)}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{gift.address}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="font-mono text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="underline">
                            {gift.amount.toFixed(2)} SUI
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{gift.amount.toFixed(9)} SUI</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="underline">
                            {new Date(gift.timestamp).toLocaleDateString()}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{new Date(gift.timestamp).toLocaleString()}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          claimGift(gift.address);
                        }}
                        disabled={gift.timestamp >= Date.now()}
                      >
                        Claim
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  );
}
