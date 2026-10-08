// react-native-mmkv jest altında (JEST_WORKER_ID) createMMKV'den kendi bellek-içi
// mock'unu döndürür ve native fabrikaya hiç dokunmaz. Ancak modül yüklenirken
// react-native-nitro-modules import edilir ve o da native TurboModule'ü arayıp patlar.
// MMKV yalnız NitroModules.createHybridObject'i (tembel) kullanır; onu çağrılırsa
// açıkça hata veren bir taslakla değiştiriyoruz.
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: (name: string) => {
      throw new Error(`Jest'te native Nitro nesnesi yok: ${name}`);
    },
  },
}));
