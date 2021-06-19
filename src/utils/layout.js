import { publicKey, struct, u64, u32, u8, bool } from "@project-serum/borsh";
import { seq } from "buffer-layout";

export const ACCOUNT_LAYOUT = struct([
  publicKey("mint"),
  publicKey("owner"),
  u64("amount"),
  u32("delegateOption"),
  publicKey("delegate"),
  u8("state"),
  u32("isNativeOption"),
  u64("isNative"),
  u64("delegatedAmount"),
  u32("closeAuthorityOption"),
  publicKey("closeAuthority"),
]);

export const MINT_LAYOUT = struct([
  u32("mintAuthorityOption"),
  publicKey("mintAuthority"),
  u64("supply"),
  u8("decimals"),
  bool("initialized"),
  u32("freezeAuthorityOption"),
  publicKey("freezeAuthority"),
]);

export const ETF_POOL_LAYOUT = struct([
  u64("status"),
  u64("nonce"),
  u64("etfPriceDecimals"),
  seq(u64(), 3, "etfMintDecimals"),
  seq(u64(), 3, "basePercentNumerators"),
  u64("basePercentDenominator"),
  u64("fluxAggregatorUpdateInterval"),
  publicKey("fluxAggregator"),
  publicKey("etfMdiMint"),
  publicKey("adminAddress"),
  seq(publicKey(), 3, "etfBaseMints"),
  seq(publicKey(), 3, "etfBaseVaults"),
]);
