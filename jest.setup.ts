jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: (name: string) => {
      throw new Error(`Jest'te native Nitro nesnesi yok: ${name}`);
    },
  },
}));
