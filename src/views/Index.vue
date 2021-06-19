<template>
  <div class="index">
    <button v-if="wallet.connected" @click="getWalletTokenAccounts">
      fetch wallet accounts!!!
    </button>

    <div>
      program id: {{ ETF_PROGRAM_ID }}
      <hr />
    </div>

    <div v-for="pool in ETF_POOLS" :key="pool.id">
      etf pool id: {{ pool.id }}
      <button @click="getEtfPoolState(pool.id)">
        1. get pool base config (state)
      </button>
      <button v-if="poolInfo" @click="getEtfPoolInfo(pool.coins)">
        2. get pool's MDI supply & vaults info
      </button>

      <div v-for="coin in pool.coins" :key="coin.mint">
        {{ coin.symbol }}: {{ coin.mint }}
      </div>
      <hr />
    </div>

    <div>
      pool info: {{ poolInfo }}
      <hr />
    </div>

    <div v-if="Object.keys(mdiInfo).length > 0 && vaultsInfo.length > 0">
      mdi info: {{ mdiInfo }}
      <div v-for="(info, index) in vaultsInfo" :key="index">
        {{ index }}: {{ info }}
      </div>
      <hr />
    </div>

    <div v-if="Object.keys(mdiInfo).length > 0 && vaultsInfo.length > 0">
      mdi amount: <input v-model="mdiAmount" type="number" />

      <div v-for="(info, index) in vaultsInfo" :key="index">
        {{ index }}:
        <!-- mdiAmount * 10 ** mdiDecimal / mdiSupply * vault balance / 10 ** coinDecimal -->

        <input
          :value="
            Big(mdiAmount)
              .mul(Big(10).pow(mdiInfo.decimals))
              .div(mdiInfo.supply)
              .mul(info.amount)
              .div(Big(10).pow(poolInfo.etfMintDecimals[index].toNumber()))
          "
          disabled
        />
      </div>

      <button v-if="wallet.connected && initialized" @click="mintMdi">
        3. mint
      </button>
      <button v-if="wallet.connected && initialized">4. redeem</button>
    </div>
  </div>
</template>

<script>
import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import Big from "big.js";
import BN from "bn.js";
import { mapState } from "vuex";
import { ETF_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@/utils/id";
import { ETF_POOLS } from "@/utils/pool";
import { ETF_POOL_LAYOUT, MINT_LAYOUT, ACCOUNT_LAYOUT } from "@/utils/layout";
import { getMultipleAccounts, findAssociatedTokenAddress } from "@/utils/web3";
import { mint } from "@/utils/etf";

export default {
  name: "Index",

  components: {},

  computed: {
    ...mapState(["wallet"]),
  },

  data() {
    return {
      ETF_PROGRAM_ID,
      ETF_POOLS,

      connection: new Connection(clusterApiUrl("testnet")),

      poolInfo: null,

      mdiInfo: {},
      vaultsInfo: [],

      mdiAmount: 1,

      initialized: false,
      accounts: {},
    };
  },

  beforeMount() {},

  methods: {
    Big,
    BN,

    async getEtfPoolState(id) {
      this.poolInfo = null;
      const { data } = await this.connection.getAccountInfo(new PublicKey(id));
      const decoded = ETF_POOL_LAYOUT.decode(data);
      this.poolInfo = decoded;
    },

    async getEtfPoolInfo() {
      this.mdiInfo = {};
      this.vaultsInfo = [];

      const { etfMdiMint, etfBaseVaults } = this.poolInfo;

      const publicKeys = [etfMdiMint, ...etfBaseVaults];

      const multipleInfo = await getMultipleAccounts(
        this.connection,
        publicKeys
      );

      let mdiInfo = {};
      const vaultsInfo = [];

      multipleInfo.forEach((info, index) => {
        if (info) {
          const { account } = info;
          const { data } = account;

          if (index === 0) {
            mdiInfo = MINT_LAYOUT.decode(data);
          } else {
            vaultsInfo.push(ACCOUNT_LAYOUT.decode(data));
          }
        }
      });

      this.mdiInfo = mdiInfo;
      this.vaultsInfo = vaultsInfo;
    },

    async getWalletTokenAccounts() {
      const accounts = {};

      const { value } = await this.connection.getParsedTokenAccountsByOwner(
        this.$wallet.publicKey,
        {
          programId: TOKEN_PROGRAM_ID,
        }
      );

      value.forEach(({ pubkey, account }) => {
        const { data } = account;
        const { parsed } = data;
        const { info } = parsed;

        accounts[pubkey.toBase58()] = info;
      });

      this.accounts = { ...accounts };
      this.initialized = true;
    },

    async mintMdi() {
      const { etfBaseVaults, etfMdiMint, etfBaseMints } = this.poolInfo;

      const mdiTokenAccount = await findAssociatedTokenAddress(
        this.$wallet.publicKey,
        etfMdiMint
      );

      const userTokenAccounts = [];

      for (const mint of etfBaseMints) {
        const tokenAccount = await findAssociatedTokenAddress(
          this.$wallet.publicKey,
          mint
        );

        if (this.accounts[tokenAccount.toBase58()]) {
          userTokenAccounts.push(tokenAccount);
        } else {
          userTokenAccounts.push(null);
        }
      }

      mint(
        this.connection,
        this.$wallet,
        ETF_POOLS[0].id,
        this.poolInfo,
        this.accounts[mdiTokenAccount.toBase58()] ? mdiTokenAccount : null,
        etfBaseVaults,
        userTokenAccounts,
        // TODO
        [
          new BN(0.005 * 10 ** 6),
          new BN(0.03 * 10 ** 6),
          new BN(0.2 * 10 ** 9),
        ],
        new BN(1 * 10 ** 6)
      ).then((tx) => {
        console.log(tx);
      });
    },
  },
};
</script>
