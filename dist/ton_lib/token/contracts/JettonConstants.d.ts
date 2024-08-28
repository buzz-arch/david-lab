export declare abstract class Op {
    static transfer: number;
    static transfer_notification: number;
    static internal_transfer: number;
    static excesses: number;
    static burn: number;
    static burn_notification: number;
    static provide_wallet_address: number;
    static take_wallet_address: number;
    static mint: number;
    static change_admin: number;
    static change_content: number;
}
export declare abstract class Errors {
    static invalid_op: number;
    static not_admin: number;
    static unouthorized_burn: number;
    static discovery_fee_not_matched: number;
    static wrong_op: number;
    static not_owner: number;
    static not_enough_ton: number;
    static not_enough_gas: number;
    static not_valid_wallet: number;
    static wrong_workchain: number;
    static balance_error: number;
}
