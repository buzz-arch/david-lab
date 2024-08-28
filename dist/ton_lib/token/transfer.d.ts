import { Cell, Sender } from "@ton/core";
import { WalletPair } from "../types";
import { TonConnectUI } from "@tonconnect/ui-react";
export declare function tonTokenTransfer(signer: WalletPair, token: string, to: string, amount: number, forwardPayload?: Cell | undefined, forwardAmount?: number | undefined): Promise<void>;
export declare function tonUiSender(connect: TonConnectUI): Sender;
export declare function tonUiTokenTransfer(connect: TonConnectUI, token: string, to: string, amount: number, forwardPayload?: Cell | undefined, forwardAmount?: number | undefined): Promise<void>;
