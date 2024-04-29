const Client = require("../db_modules/client");
const Pet = require("../db_modules/pet")

async function getPetById(pet_id) {
  try {
    const pet_record = await Pet.findOne({petID: pet_id, activeFlag: true});
    console.log("Pet_record:",pet_record)
    if (!pet_record) {
      console.log("petID undefined");
    }
    return pet_record;
  } catch(error) {
      console.error("Error returning client information:", error);
      throw error;
  }
}

async function getPetNamesByID(pet_IDs) {
  let petNames = [];
  for(let i=0; i<pet_IDs.length; i++) {
    const pet = await Pet.findOne({petID: pet_IDs[i]});
    petNames.push(pet.petName);
  }
  return petNames;
}

async function petSearch(searchQuery) {
  let pets = []; // Initialize pets array
  pets = await Pet.find({activeFlag: true}, {
    $or: [
      { petName: { $regex: searchQuery, $options: "i" } }, // Search by pet name (case-insensitive)
      { petBreed: { $regex: searchQuery, $options: "i" } }, // Search by pet breed (case-insensitive)
    ],
  }).sort({ petName: 1 }); // Sort pets by petName
  return pets;
}

// gets a collections of pets when given a certain start point and end point
async function getPets(start, end, user_type, owner_id) {
  if(user_type=='Client') {
    try {
      const pet_records = await Pet.find({ownerID: owner_id, activeFlag: true}).sort({petName:1}).skip(start-1).limit(end);
      return pet_records;
    } catch(error) {
        console.error("Error returning client information:", error);

        throw error;
    }
  }
  if(user_type=='Employee') {
    try {
      const pet_records = await Pet.find({activeFlag: true}).sort({petName:1}).skip(start-1).limit(end);
      return pet_records;
    } catch(error) {
        console.error("Error returning client information:", error);
        throw error;
    }
  }

};

async function removePet(pet_ID) {
  try {
    const result = await Pet.updateOne({ petID: pet_ID }, { $set: {activeFlag: false} });
    // currently not working with changing teh info in the database --> still works in mongosh, so its something in the code
    if (result.nModified === 0) {
      console.log("Pet Not Found")
      return false;
    } else {
      return true;
    }
  } catch(error) {
    console.log(error);
    return false;
  }
}

async function editPet(petID, petName, petType, petBreed, petSex, petDOB, petWeight) {
  try {
    const result = await Pet.updateOne({ petID }, { petName, petType, petBreed, petSex, petDOB, petWeight });
    if (result.nModified === 0) {
      // If no records were modified, the pet was not found
      console.log("Pet Not Found");
      return false;
    } else {
      console.log("Pet Updated Successfully")
      return true;
    }
  } catch (error) {
    console.error("Error updating pet:", error);
    return false;
  }
}


// returns true if pet is unique and false if not
async function checkForDuplicates(petName, ownerID, DOB) {
  try {
    const result = await Pet.findOne({petName: petName, ownerID: ownerID, petDOB: DOB}) 
    if(!result) {
      return true;
    } else {
      return false;
    }
  } catch(error) {
    console.log(error);
    return false;;
  }
}

// tries to add a pet: if pet is unique will add it and return true, else will not add it and return false
/*async function addPet(name, type, breed, sex, DOB, weight, ownerFN, ownerLN) {
  try {
    const ownerID = await findOwnerID(ownerFN, ownerLN);
    const unique = await checkForDuplicates(name, ownerID, DOB);
    if(unique) {
      newPetID = await getNextPetID();
      const newPet = new Pet({
        petID: newPetID,
        ownerID: ownerID,
        petName: name,
        petType: type,
        petBreed: breed,
        petSex: sex,
        petDOB: DOB,
        petWeight: weight,
        activeFlag: true,
        modifiedDate: 0,
        createTime: new Date()
      });
      await newPet.save();
      console.log(newPet);
      return true;
    } else {
      console.log("Pet is a duplicate")
      return false;
    }

   } catch(error) {
    console.log(newPet);
    console.log("Unable to add pet");
    return false;
   }
   
}
*/
async function addPet(name, type, breed, sex, DOB, weight, ownerFN, ownerLN) {
    const ownerID = await findOwnerID(ownerFN, ownerLN);
    const unique = await checkForDuplicates(name, ownerID, DOB);
    if(unique){
      newPetID = await getNextPetID();
      console.log(newPetID);
      const newPet = new Pet({
        petID: newPetID,
        ownerID: ownerID,
        petName: name,
        petType: type,
        petBreed: breed,
        petSex: sex,
        petDOB: DOB,
        petWeight: weight,
        activeFlag: true,
        modifiedDate: new Date(),
        createTime: new Date()
      });
      await newPet.save();
      /*console.log(newPet);*/
      return true;
    }else{
      return false;
    }
}

async function getClients(ownerIDs) {
  const pet_owners = await Client.find({ clientID: { $in: ownerIDs } });
  return pet_owners;
}

async function getPetsByClient(ownerID) {
  const pets = await Pet.find({ownerID: ownerID});
  return pets;
}

// returns ID if client is found or zero if not
async function findOwnerID(ownerFN, ownerLN) {
  try {
    const client = await Client.findOne({ clientFN: ownerFN, clientLN: ownerLN });
    if (client) {
      const id = client.clientID;
      return id;
    } else {
      return 0;
    }
  } catch (error) {
    console.error(error);
    throw new Error('Error finding owner ID');
  }
}

async function getNextPetID() {
  try {
      // Find the maximum employee ID
      const maxPet = await Pet.find().sort({ petID: -1 }).limit(1);
      maxPetID = Math.max(maxPet[0]?.petID || 0);
      const maxID = maxPetID + 1;
      return maxID;
  } catch (error) {
      console.error("Error calculating next empID:", error);
      throw error;
  }
}


module.exports = {
  petSearch,
  getPetById,
  getPets,
  editPet,
  removePet,
  addPet,
  getClients,
  getPetNamesByID
}