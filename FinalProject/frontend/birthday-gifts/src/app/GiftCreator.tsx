import { useState } from "react";
import LoadingOverlay from "react-loading-overlay-ts";
import { GridLoader } from "react-spinners";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/card";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@radix-ui/react-popover";
import { Calendar } from "@/components/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/button";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { MIST_PER_SUI } from "@mysten/sui.js/utils";
import { useWalletKit } from "@mysten/wallet-kit";

export default function GiftCreator(props: {
  isTxnInProgress: boolean;
  setTxn: (isTxnInProgress: boolean) => void;
}) {
  const [address, setAddress] = useState<string | undefined>();
  const [amount, setAmount] = useState<string | undefined>("0");
  const [date, setDate] = useState<Date | undefined>();

  const { signAndExecuteTransactionBlock } = useWalletKit();

  const addGift = async () => {
    if (address == undefined || amount == undefined || date == undefined) {
      return;
    }

    const amount_num = parseFloat(amount);
    if (Number.isNaN(amount_num) || amount_num < 0) {
      return;
    }
    props.setTxn(true);

    const txb = new TransactionBlock();
    const [coin] = txb.splitCoins(txb.gas, [
      txb.pure(amount_num * Number(MIST_PER_SUI)),
    ]);

    txb.moveCall({
      target: `${process.env.MODULE_ADDRESS}::${process.env.MODULE_NAME}::add_birthday_gift`,
      arguments: [
        coin,
        txb.pure(address),
        txb.pure(date.getTime()),
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

    setAddress(undefined);
    setAmount("0");
    setDate(undefined);

    props.setTxn(false);
  };

  return (
    <LoadingOverlay
      active={props.isTxnInProgress}
      spinner={<GridLoader color="#94a3b8" margin={0} speedMultiplier={0.75} />}
    >
      <Card>
        <CardHeader>
          <CardTitle>Create Gift</CardTitle>
          <CardDescription className="break-normal w-96">
            Enter the address and amount of SUI to send.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="my-2">
            <Label htmlFor="address">Recipient&#39;s address</Label>
            <Input
              type="address"
              id="address"
              value={address || ""}
              placeholder="0x0000"
              className="font-mono"
              onChange={(event) => {
                setAddress(event.target.value);
              }}
            />
          </div>
          <div className="my-2">
            <Label htmlFor="amount">Gift amount</Label>
            <Input
              type="amount"
              id="amount"
              value={amount || ""}
              placeholder="0"
              className="font-mono"
              onChange={(event) => {
                setAmount(event.target.value);
              }}
            />
          </div>
          <div className="my-3 flex justify-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Select birthday</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="rounded-md border bg-white dark:bg-slate-950 dark:border-slate-900 z-50">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus={true}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={() => {
              addGift();
            }}
            disabled={
              address == undefined || amount == undefined || date == undefined
            }
          >
            Create gift
          </Button>
        </CardFooter>
      </Card>
    </LoadingOverlay>
  );
}
