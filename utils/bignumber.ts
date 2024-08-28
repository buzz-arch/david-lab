import BN from "bn.js";

export const toDecimalsBN = (num: number, decimals: number|string): bigint => {
  if (typeof decimals === 'string')
    decimals = parseInt(decimals)

  let numstr = "0"
  if (Number.isInteger(num)) {
    numstr = (new BN(num).mul(new BN(10 ** decimals))).toString()
  } else {
    numstr = Math.floor((Number(num.toFixed(decimals)) * (10 ** decimals))).toString()
  }
  return BigInt(numstr);
}

export const fromDecimalsBN = (amount: string|bigint, decimals: number | string = 6): number => {
  if (typeof decimals === 'string')
    decimals = parseInt(decimals)
  return Number(amount) / (10 ** decimals)
}