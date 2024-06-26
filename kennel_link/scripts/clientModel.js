const Client = require("../db_modules/client")

// gets a singular client with the matching ID
async function getClientById(client_id) {
    try {
      const client_record = await Client.findOne({clientID: client_id});
      if (!client_record) {
        console.log("clientID undefined");
      }
      // const client_record = await Client.find({clientID: client_id});
      return client_record;
    } catch(error) {
        console.error("Error returning client information:", error);
        throw error;
    }
};

async function getAllClients(start, end) {
  try {
    const clients = await Client.find({activeFlag: true}).sort({clientLN:1}).skip(start-1).limit(end-start+1);
    return clients;
  } catch(error) {
      console.error("Error returning client information:", error);
      throw error;
  }
}

// gets a list of clients when given a list of IDs --> will get duplicates if they exist
async function getClientsByID(clientIDs) {
  try {
    let clients = []
    for(let i =0; i<clientIDs.length; i++) {
      let ID = parseInt(clientIDs[i]);
      let result = await Client.findOne({clientID: ID});
      clients.push(result);
    }
    return clients;
  } catch(error){
    console.log("issues")
    return null
  }
}


async function removeClient(clientID) {
  try {
    const result = Client.updateOne({clientID: clientID},{$set: {activeFlag: false}});
    if (result.nModified === 0) {
      console.log("Client Not Found")
      return false;
    } else {
      return true;
    }
  } catch(error) {
    console.log(error);
    return false;
  }
}

async function editClient(ID, first, last, phone, email) {
  try {
    const result = await Client.updateOne({ clientID: ID }, { clientFN: first, clientLN: last, clientPhone: phone, clientEmail: email });
    if (result.nModified === 0) {
      // If no records were modified, the client was not found
      console.log("Client Not Found");
      return false;
    } else {
      console.log("Client Updated Successfully")
      return true;
    }
  } catch(error) {
    console.log("Client Not Found");
    return false;
  }
}

module.exports = {
  getClientById,
  getClientsByID,
  getAllClients,
  removeClient,
  editClient
}