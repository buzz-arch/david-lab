import { JettongDeployParam, WalletPair } from "../types";
import { TonConnectUI } from "@tonconnect/ui-react";
export declare function deployContract(params: JettongDeployParam, signer: WalletPair): Promise<import("@ton/core").Address>;
export declare function uiDeployContract(params: JettongDeployParam, connection: TonConnectUI): Promise<import("@ton/core").Address>;
