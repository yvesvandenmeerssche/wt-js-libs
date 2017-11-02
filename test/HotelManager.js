const assert = require('chai').assert;
const util = require('../libs/util/index');
const _ = require('lodash');

const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider('http://localhost:8545')
const web3 = new Web3(provider);

let HotelManager;

(process.env.TEST_BUILD)
  ? HotelManager = require('../dist/node/HotelManager.js')
  : HotelManager = require('../libs/HotelManager.js');

describe('HotelManager', function() {
  const hotelName = 'WTHotel';
  const hotelDescription = 'Winding Tree Hotel';
  const gasMargin = 1.5;

  let lib;
  let index;
  let fundingSource;
  let daoAccount;
  let ownerAccount;

  before(async function(){
    const wallet = await web3.eth.accounts.wallet.create(2);
    const accounts = await web3.eth.getAccounts();

    fundingSource = accounts[0];
    ownerAccount = wallet["0"].address;
    daoAccount = wallet["1"].address;

    await util.fundAccount(fundingSource, ownerAccount, 50, web3);
    await util.fundAccount(fundingSource, daoAccount, 50, web3);
  })

  beforeEach(async function() {
    index = await util.deployIndex({
      owner: daoAccount,
      gasMargin: gasMargin,
      web3: web3
    });

    lib = new HotelManager({
      indexAddress: index.options.address,
      owner: ownerAccount,
      gasMargin: gasMargin,
      web3: web3
    })
  });

  describe('createHotel', function(){

    it('should create a hotel | retrieve hotel from the blockchain', async function() {
      await lib.createHotel(hotelName, hotelDescription);
      const hotels = await lib.getHotels();
      const address = Object.keys(hotels)[0];
      const hotel = hotels[address];

      assert.equal(hotel.name, hotelName);
      assert.equal(hotel.description, hotelDescription);
    })
  });

  describe('Hotel', function(){
    let address;

    beforeEach(async function(){
      await lib.createHotel(hotelName, hotelDescription);
      const hotels = await lib.getHotels();
      address = Object.keys(hotels)[0];
    });

    it('setRequireConfirmation: sets the confirmation requirement status', async function(){
      let hotel = await lib.getHotel(address);
      assert.isFalse(hotel.waitConfirmation);

      await lib.setRequireConfirmation(address, true);
      hotel = await lib.getHotel(address);
      assert.isTrue(hotel.waitConfirmation);
    });

    it('changeHotelInfo: edits the hotel info', async function(){
      const newName = 'Awesome WTHotel';
      const newDescription = 'Awesome Winding Tree Hotel';

      await lib.changeHotelInfo(address, newName, newDescription);
      const hotel = await lib.getHotel(address);

      assert.equal(hotel.name, newName);
      assert.equal(hotel.description, newDescription);
    });

    it('changeHotelAddress: edits the hotel address', async function(){
      const lineOne = 'Address one';
      const lineTwo = 'Address two';
      const zip = '57575';
      const country = 'Spain';

      await lib.changeHotelAddress(address, lineOne, lineTwo, zip, country);
      const hotel = await lib.getHotel(address);

      assert.equal(hotel.lineOne, lineOne);
      assert.equal(hotel.lineTwo, lineTwo);
      assert.equal(hotel.zip, zip);
      assert.equal(hotel.country, country);
    });

    it('changeHotelLocation: edits the hotel address', async function(){
      const timezone = 15;
      const longitude = 50;
      const latitude = 15;

      await lib.changeHotelLocation(address, timezone, latitude, longitude);
      const hotel = await lib.getHotel(address);

      assert.equal(hotel.longitude, longitude);
      assert.equal(hotel.latitude, latitude);
    });
  });

  describe('UnitTypes', () => {
    const typeName = 'BASIC_ROOM'
    let address;

    beforeEach(async function(){
      await lib.createHotel(hotelName, hotelDescription);
      const hotels = await lib.getHotels();
      address = Object.keys(hotels)[0];
    });

    it('addUnitType: adds a unit type to the hotel', async () => {
      await lib.addUnitType(address, typeName);
      const hotel = await lib.getHotel(address);

      assert(hotel.unitTypeNames.includes(typeName));
      assert.isDefined(hotel.unitTypes[typeName]);
    });

    it('addUnitType: initializes info correctly', async() => {
      await lib.addUnitType(address, typeName);
      let hotel = await lib.getHotel(address);

      assert.isNull(hotel.unitTypes[typeName].info.description);
      assert.isNull(hotel.unitTypes[typeName].info.price);
      assert.isNull(hotel.unitTypes[typeName].info.minGuests);
      assert.isNull(hotel.unitTypes[typeName].info.maxGuests);
    });

    it('removeUnitType: removes a UnitType from the hotel', async() => {
      await lib.addUnitType(address, typeName);
      let hotel = await lib.getHotel(address);

      assert(hotel.unitTypeNames.includes(typeName));
      assert.isDefined(hotel.unitTypes[typeName]);

      await lib.removeUnitType(address, typeName);
      hotel = await lib.getHotel(address);

      assert.isFalse(hotel.unitTypeNames.includes(typeName));
      assert.isUndefined(hotel.unitTypes[typeName]);
    });

    it('editUnitType: edits UnitType info correctly', async() => {
      const description = 'Adobe';
      const minGuests = 1;
      const maxGuests = 2;
      const price = '250 euro';

      await lib.addUnitType(address, typeName);
      await lib.editUnitType(
        address,
        typeName,
        description,
        minGuests,
        maxGuests,
        price
      );
      let hotel = await lib.getHotel(address);

      assert.equal(hotel.unitTypes[typeName].info.description, description);
      assert.equal(hotel.unitTypes[typeName].info.price, price);
      assert.equal(hotel.unitTypes[typeName].info.minGuests, minGuests);
      assert.equal(hotel.unitTypes[typeName].info.maxGuests, maxGuests);
    });

    it('addAmenity: adds an amenity to the UnitType', async () => {
      const amenity = 10;
      await lib.addUnitType(address, typeName);
      await lib.addAmenity(address, typeName, amenity);
      let hotel = await lib.getHotel(address);

      assert.isTrue(hotel.unitTypes[typeName].amenities.includes(amenity));
    });

    it('removeAmenity: removes an amenity from the UnitType', async () => {
      const amenity = 10;
      await lib.addUnitType(address, typeName);
      await lib.addAmenity(address, typeName, amenity);
      let hotel = await lib.getHotel(address);

      assert.isTrue(hotel.unitTypes[typeName].amenities.includes(amenity));

      await lib.removeAmenity(address, typeName, amenity);
      hotel = await lib.getHotel(address);

      assert.isFalse(hotel.unitTypes[typeName].amenities.includes(amenity));
    });
  });

  describe('Units: Adding and Removing', () => {
    const typeName = 'BASIC_ROOM'
    let address;

    beforeEach(async function(){
      await lib.createHotel(hotelName, hotelDescription);
      const hotels = await lib.getHotels();
      address = Object.keys(hotels)[0];
      await lib.addUnitType(address, typeName);
    });

    it('addUnit: adds a unit to the hotel', async () => {
      await lib.addUnit(address, typeName);
      const hotel = await lib.getHotel(address);
      const unitAddress = hotel.unitAddresses[0];

      assert.isDefined(hotel.units[unitAddress]);
      assert.isTrue(hotel.units[unitAddress].active);
      assert.equal(hotel.units[unitAddress].unitType, typeName);
    });

    it('removeUnit: removes a unit from the hotel', async () => {
      await lib.addUnit(address, typeName);
      let hotel = await lib.getHotel(address);
      const unitAddress = hotel.unitAddresses[0];

      assert.isDefined(hotel.units[unitAddress]);

      await lib.removeUnit(address, unitAddress);
      hotel = await lib.getHotel(address);

      assert.isUndefined(hotel.units[unitAddress]);
    });
  });

  describe('Units: Attributes and Prices', function(){
    const typeName = 'BASIC_ROOM'
    let hotelAddress;
    let unitAddress;
    let hotel;

    beforeEach(async function(){
      await lib.createHotel(hotelName, hotelDescription);
      const hotels = await lib.getHotels();
      hotelAddress = Object.keys(hotels)[0];

      await lib.addUnitType(hotelAddress, typeName);
      await lib.addUnit(hotelAddress, typeName);
      hotel = await lib.getHotel(hotelAddress);
      unitAddress = hotel.unitAddresses[0];
    });

    it('setUnitActive: sets the units active status', async () => {
      assert.isTrue(hotel.units[unitAddress].active);

      await lib.setUnitActive(hotelAddress, unitAddress, false);
      hotel = await lib.getHotel(hotelAddress);
      assert.isFalse(hotel.units[unitAddress].active);
    })

    it('setDefaultPrice: set / get the default price', async() => {
      const price = 100.00
      await lib.setDefaultPrice(hotelAddress, unitAddress, price);
      hotel = await lib.getHotel(hotelAddress)
      const priceSet = hotel.units[unitAddress].defaultPrice;
      assert.equal(priceSet, price);
    })

    it('setDefaultLifPrice: set / get the default Lif price', async() => {
      const lifPrice = 20
      await lib.setDefaultLifPrice(hotelAddress, unitAddress, lifPrice);
      hotel = await lib.getHotel(hotelAddress);
      const lifPriceSet = await hotel.units[unitAddress].defaultLifPrice;

      assert.equal(lifPriceSet, lifPrice);
    })

    it('setUnitSpecialPrice: sets the units price across a range of dates', async () => {
      const price =  100.00;
      const fromDate = new Date('10/10/2020');
      const daysAmount = 5;

      await lib.setUnitSpecialPrice(
        hotelAddress,
        unitAddress,
        price,
        fromDate,
        daysAmount
      )

      const fromDay = util.formatDate(fromDate);
      const range = _.range(fromDay, fromDay + daysAmount);

      for (let day of range) {
        const {
          specialPrice,
          specialLifPrice,
          bookedBy
        } = await lib.getReservation(unitAddress, day);

        assert.equal(specialPrice, price);
      }
    });

    it('setUnitSpecialLifPrice: sets the units price across a range of dates', async () => {
      const price =  100;
      const fromDate = new Date('10/10/2020');
      const daysAmount = 5;

      await lib.setUnitSpecialLifPrice(
        hotelAddress,
        unitAddress,
        price,
        fromDate,
        daysAmount
      )

      const fromDay = util.formatDate(fromDate);
      const range = _.range(fromDay, fromDay + daysAmount);

      for (let day of range) {
        const {
          specialPrice,
          specialLifPrice,
          bookedBy
        } = await lib.getReservation(unitAddress, day);

        assert.equal(specialLifPrice, price);
      }
    });

    it('setCurrencyCode: sets the setCurrencyCode', async() => {
      const currencyCode = 10;

      assert.isNull(hotel.units[unitAddress].currencyCode);

      await lib.setCurrencyCode(hotelAddress, unitAddress, currencyCode);
      hotel = await lib.getHotel(hotelAddress);

      const setCurrencyCode = hotel.units[unitAddress].currencyCode;
      assert.equal(setCurrencyCode, currencyCode);
    });

    it('setCurrencyCode: throws on invalid currencyCode', async() => {
      try {
        await lib.setCurrencyCode(hotelAddress, unitAddress, 256);
        assert(false);
      } catch(e){}

      try {
        await lib.setCurrencyCode(hotelAddress, unitAddress, -5);
        assert(false);
      } catch(e){}

      try {
        await lib.setCurrencyCode(hotelAddress, unitAddress, 'EUR');
        assert(false);
      } catch(e){}
    });
  });
});
