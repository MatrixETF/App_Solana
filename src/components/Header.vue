<template>
  <div>
    <button v-if="!wallet.connected" @click="connect">connect wallet</button>
    <button v-else>connected as {{ $wallet.publicKey }}</button>
  </div>
</template>

<script>
import Vue from "vue";
import { mapState } from "vuex";
import Wallet from "@project-serum/sol-wallet-adapter";

export default {
  computed: {
    ...mapState(["wallet"]),
  },

  methods: {
    async connect() {
      const wallet = new Wallet("https://www.sollet.io");

      wallet.on("connect", () => {
        Vue.prototype.$wallet = wallet;
        this.$store.commit("setConnected");
      });
      wallet.on("disconnect", () => {
        this.$store.commit("setDisconnected");
        Vue.prototype.$wallet = null;
      });

      await wallet.connect();
    },
  },
};
</script>
