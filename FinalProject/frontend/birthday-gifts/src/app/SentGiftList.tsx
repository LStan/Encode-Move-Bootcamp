import { useEffect, useState } from "react";
import { useWalletKit } from "@mysten/wallet-kit";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { BCS, getSuiMoveConfig } from "@mysten/bcs";
import { MIST_PER_SUI } from "@mysten/sui.js/utils";
import { CardDescription, CardTitle } from "@/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { ScrollArea } from "@/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/alert-dialog";
import { Button } from "@/components/button";
import { X } from "lucide-react";

type Gift = {
  address: string;
  amount: number;
  timestamp: number;
};

export default function SentGiftList(props: {
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
      target: `${process.env.MODULE_ADDRESS}::${process.env.MODULE_NAME}::view_gifter_gifts`,
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

    let recipients = bcs.de("vector<address>", new Uint8Array(res2[0][0]));
    let gift_amounts = bcs.de("vector<u64>", new Uint8Array(res2[1][0]));
    let birthday_timestamp_ms = bcs.de(
      "vector<u64>",
      new Uint8Array(res2[2][0])
    );

    let result: Gift[] = [];
    for (let i = 0; i < recipients.length; i += 1) {
      result.push({
        address: recipients[i],
        amount: Number(gift_amounts[i]) / Number(MIST_PER_SUI),
        timestamp: Number(birthday_timestamp_ms[i]),
      });
    }
    // console.log(result);

    return result;
  };

  const cancelGift = async (recipientAddress: string) => {
    props.setTxn(true);

    const txb = new TransactionBlock();
    txb.moveCall({
      target: `${process.env.MODULE_ADDRESS}::${process.env.MODULE_NAME}::remove_birthday_gift`,
      arguments: [
        txb.pure(recipientAddress),
        txb.object(`${process.env.STATE_ADDRESS}`),
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
        <CardTitle className="my-2">Gifts sent from you</CardTitle>
        <CardDescription className="break-normal w-96">
          View all of the unclaimed gifts you have sent to others. You can
          cancel any of these gifts at any time and the SUI will be returned to
          your wallet.
        </CardDescription>
      </div>
      <ScrollArea className="border rounded-lg">
        <div className="h-fit max-h-56">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Recipient</TableHead>
                <TableHead className="text-center">Birthday</TableHead>
                <TableHead className="text-center">Amount</TableHead>
                <TableHead className="text-center">Cancel gift</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gifts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <p className="break-normal w-100 text-center">
                      You don't have any active gifts. Send some gifts to you friends
                    </p>
                  </TableCell>
                </TableRow>
              )}
              {gifts.map((gift, index) => {
                return (
                  <TableRow key={index}>
                    <TableCell className="font-mono">
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <X className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will cancel the gift for{" "}
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
                              </TooltipProvider>{" "}
                              and return the{" "}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger className="underline">
                                    {gift.amount.toFixed(2)} SUI
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{gift.amount.toFixed(9)} SUI</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>{" "}
                              SUI to your wallet.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogAction
                              onClick={() => {
                                cancelGift(gift.address);
                              }}
                            >
                              Yes
                            </AlertDialogAction>
                            <AlertDialogCancel>No</AlertDialogCancel>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
