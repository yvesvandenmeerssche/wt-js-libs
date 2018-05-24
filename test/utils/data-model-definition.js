import offChainData from './data/off-chain-data.json';
import { storageInstance } from '../../src/off-chain-data-accessors/in-memory';

export const Web3UriBackedDataModel = {
  emptyConfig: {},
  withDataSource: () => ({
    dataModelOptions: {
      provider: 'http://localhost:8545',
    },
  }),
  indexAddress: '0x8c2373842d5ea4ce4baf53f4175e5e42a364c59c',
  emptyIndexAddress: '0x994afd347b160be3973b41f0a144819496d175e9',
};

for (let key in offChainData) {
  storageInstance.update(key, offChainData[key]);
}

export default Web3UriBackedDataModel;
