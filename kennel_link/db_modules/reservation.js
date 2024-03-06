const {Int32} = require("mongodb");
const mongoose = require("../database");

/*Creates a schema for the reservation to create and 
fetch data from reservation collection in database*/
/*
[
  {
    name: 'reservation',
    type: 'collection',
    options: {
      validator: {
        '$jsonSchema': {
          bsonType: 'object',
          required: [
            'clientID',
            'petID',
            'arrivalDate',
            'departureDate',
            'empID'
          ],
          properties: {
            RID: { bsonType: 'int' },
            clientID: { bsonType: 'int' },
            petID: { bsonType: 'int' },
            arrivalDate: { bsonType: 'date' },
            departureDate: { bsonType: 'date' },
            kennelID: { bsonType: 'int' },
            empID: { bsonType: 'int' },
            createTime: { bsonType: 'date' },
            activeFlag: { bsonType: 'bool' },
            modifiedDate: { bsonType: [Array] }
          }
        }
      }
    },
    info: {
      readOnly: false,
      uuid: new UUID("17676f5f-a39b-4745-b95e-c73db4e539cc")
    },
    idIndex: { v: 2, key: { _id: 1 }, name: '_id_' }
  }
]
*/

const reservation = new mongoose.Schema( {
    RID : Int32,
    clientID : Int32,
    petID : Int32,
    arrivalDate : Date,
    departureDate : Date,
    kennelID : Int32,
    empID : Int32,
    // createTime : { type: Date, default: Date.now },
    createTime : Date,
    activeFlag : Boolean,
    modifiedDate : {type: [Date, Int32]}
    },
    {
        timestamps : true
    }
)

const Reservation = mongoose.model("reservation", reservation);

module.exports = Reservation;