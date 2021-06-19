import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

const wallet = {
  state: () => ({
    connected: false,
  }),
  mutations: {
    setConnected(state) {
      state.connected = true;
    },

    setDisconnected(state) {
      state.connected = false;
    },
  },
  actions: {},
  getters: {},
};

export default new Vuex.Store({
  state: {},
  mutations: {},
  actions: {},
  modules: {
    wallet,
  },
});
