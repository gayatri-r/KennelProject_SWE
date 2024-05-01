const express = require('express')
const methodOverride = require("method-override");
const mongoose = require("./database");
const client = require('./scripts/clientModel')
const pet = require('./scripts/petModel')
const transaction = require('./scripts/transactionModel')
const session = require('express-session')
const reservation = require("./scripts/reservationModel")
const employee = require("./scripts/empModel")
const signup_login = require("./scripts/signupLoginModel")

let livereload = require("livereload");
let connectLiveReload = require("connect-livereload");
const liveReloadServer = livereload.createServer();
liveReloadServer.server.once("connection", () => {
  setTimeout(() => {
    liveReloadServer.refresh("/");
  }, 100000000);

});

require("dotenv").config({path:'../data.env'});

const app = express()

app.set('view engine', 'ejs')
app.use(connectLiveReload());
app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true }));
app.use("/static", express.static("static"));
app.use('/styles', express.static('./styles'));
app.use(session({
  secret: 'edliweflaiuehf389dixkxsozdj9w209228', 
  resave: false,
  saveUninitialized: false
}));

app.get('/', (req, res) => {
  res.render('pages/homepage')
})

app.get("/login", (req,res) => {
  res.render("pages/login", {message: ""});
})

app.post("/login", async (req,res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;
    const user_type = req.body.user_type;
    const result = await signup_login.authenticateLogin(username, password, user_type)
    console.log(result.worked)
    if(result.worked === true) {
      req.session.user = result.response
      req.session.type = user_type
      res.render("pages/dashboard", {user: result.response, type: user_type})
    } else {
      res.render("pages/login", {message: result.message})
    }
  } catch (error) {
    console.error("Error occurred during login:", error);
    res.status(500).json({message: error.message}); 
      }
})

app.get("/signup", (req, res) => {
  res.render("pages/signup", {message: ""});
})

app.post("/signup", async (req, res) => {
  try {
    // Extract signup data from the request body
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const email = req.body.email;
    const phone = req.body.phone;
    const username = req.body.username;
    const password = req.body.password;
    const user_type = req.body.user_type;

    let result = await signup_login.uniqueUser(user_type, username, email, phone);

    if(user_type === 'Client' && result.unique === true) {
      await signup_login.addClient(first_name, last_name, email, phone, username, password);
      res.redirect("/login");
    } else if (user_type === 'Employee' && result.unique === true) {
      await signup_login.addEmployee(first_name, last_name, email, phone, username, password);
      res.redirect("/login");
    } else {
      res.render("pages/signup", {message: result.message});
    }

  } catch (error) {
    // Handle any errors that occur during the signup process
    console.error(error);
    /*res.status(500).send(errorMsg);*/
    res.render("pages/signup",{message: error})
  }
});


app.get("/logout", (req,res) => {
  req.session.destroy();
  res.redirect("/")
})

app.get("/dashboard", (req,res) => {
  const user = req.session.user
  const type = req.session.type
  if(user) {
    res.render("pages/dashboard", {user: user, type: type})
  } else {
    res.redirect("/login")
  }
})

app.get("/reservations", (req,res) => {
  const user = req.session.user
  const user_type = req.session.type
  
  if(user) {
    res.render("pages/reservations", {user: user, type: user_type})
  } else {
    res.redirect("/login")
  }
})

app.get("/res_add", (req,res) => {
  try {
    const user = req.session.user
    const user_type = req.session.type
    if(user) {
    res.render("pages/res_add", {user: user, type: user_type, message: ""})
    } else {
    res.redirect("/login") 
    }
  } catch (error) {
    console.log("The error is: " + error)
    res.redirect("/login")
  }
})

app.post("/res_add", async (req,res) => {
  const user = req.session.user;
  const user_type = req.session.type;
  if(user) {
    const first = req.body.client_fn;
    const last = req.body.client_ln;
    const pet = req.body.pet_name;
    const arrival = req.body.arrival_date;
    const departure = req.body.end_date;
    const emp_id = req.body.emp_id;
    const result = await reservation.addReservationWithCheck(first, last, pet, arrival, departure, emp_id)
    if(result.worked) {
      // create new transaction
      const re = await transaction.makeTransFromRes(first, last, result.RID, arrival, departure);
      res.render("pages/res_add", {user: user, type: user_type, message: "Reservation Added"})
    } else {
      res.render("pages/res_add", {user: user, type: user_type, message: "Error: Unable to add Reservation"})
    }
  } else {
    res.redirect("/login")
  }
});

app.get("/res_edit", async (req,res) => {
  const resID = req.query.resID;
  const user_type = req.session.type
  try {
    const found_res = await reservation.getResById(parseInt(resID));
    if (!found_res) {
      const user = req.session.user
      res.status(404).send(
        '<script> alert("Reservation not found"); </script>'+
        '<script> window.location.href = "/reservations"; </script>'
      );
      //res.status(404).send("Reservation not found");
    }
    res.render("pages/res_edit", { found_res: found_res, type: user_type });
  } catch (error) {
    console.error("Error fetching client data:", error);
    const user = req.session.user
    res.status(500).send(
      '<script> alert("Internal Server Error"); </script>'+
      '<script> window.location.href = "/reservations"; </script>'
    );
    //res.status(500).send("Internal Server Error");
  }
});

app.post("/update_res/:RID", async (req,res) => {
  const res_ID = req.params.RID;
  const { new_arrival_date, new_depart_date } = req.body;
  try {
    // Update the client information in the database
    const result = reservation.editRes(res_ID, new_arrival_date, new_depart_date)
    if(result) {
      res.status(200).send(
        '<script> alert("Reservation updated successfully"); </script>'+
        '<script> window.location.href = "/reservations"; </script>'
      );
      //res.status(200).send("Reservation updated successfully");
    } else {
      console.log("Error Updating Reservation")
    }
  } catch (error) {
    console.error("Error updating reservation:", error);
  }
});

app.post("/cancel_res/:RID", async (req,res) => {
  const res_ID = req.params.RID;
  const entered = req.body.cancel_res_id
  try {
    if(parseInt(res_ID) == entered) {
      const result = await reservation.cancelRes(parseInt(res_ID))
      if(result) {
        res.status(200).send(
          '<script> alert("Reservation deleted successfully"); </script>'+
          '<script> window.location.href = "/reservations"; </script>'
        );
        //res.status(200).send("Reservation deleted successfully");
      } else {
        console.log("Error")
      }
    } else {
      console.log("Something Didnt work")
    }
  } catch (error) {
    console.error("Error deleting Reservation:", error);
  }
});

app.get("/clients", (req,res) => {
  const user = req.session.user
  const user_type = req.session.type
  if(user) {
    res.render("pages/emp_clients", {type: user_type});
  } else {
    res.redirect("/login")
  }
})

app.get("/pets", (req,res) => {
  const user = req.session.user;
  const user_type = req.session.type; 
  if(user) {
    res.render("pages/pets", {user: user, type: user_type});
  } else {
    res.redirect("/login")
  }
  
});

app.get("/transactions", (req,res) => {
  const user = req.session.user;
  const user_type = req.session.type; 
  if(user) {
    res.render("pages/transactions", {user: user, type: user_type});
  } else {
    res.redirect("/login")
  }
  
});

app.get("/add_pets", async (req, res) => {
  try {
    const user = req.session.user;
    const user_type = req.session.type;

    if (user) {
      if (user_type === "Client") {
        // If the user is a client, render the add_pets page without their first and last name
        res.render("pages/add_pets", { type: user_type, user: user, message: "", ownerFN: user.clientFN, ownerLN: user.clientLN });
      } else if(user_type === "Employee") {
        // If the user is not a client (e.g., an employee), render the add_pets page with owner information
        res.render("pages/add_pets", { type: user_type, user: user, message: "", ownerFirst: "", ownerLast: "" });
      }
    } else {
      // If no user is logged in, you might want to redirect them to a login page or handle it in another way
      res.redirect("/"); // For example, redirect to a login page
    }

  } catch (error) {
    console.error("Error fetching clients:", error);
    res.status(500).send(
      '<script> alert("Internal Server Error"); </script>'+
      '<script> window.location.href = "/"; </script>'
    );
    //res.status(500).send("Internal Server Error");
  }
});


app.post("/add_pets", async (req, res) => {
  try {
    // Extract pet data from the request body
    const user = req.session.user;
    const user_type = req.session.type;

    if (user_type === "Client") { // Ensure you compare to a string
      const { petName, petType, petBreed, petSex, petDOB, petWeight } = req.body; 
      const ownerFirst = user.clientFN;
      const ownerLast = user.clientLN;

      const result = await pet.addPet(petName, petType, petBreed, petSex, petDOB, petWeight, ownerFirst, ownerLast);
      if (result === true) {
        res.render("pages/add_pets", { type: user_type, message: "Successfully added Pet", ownerFN: ownerFirst, ownerLN: ownerLast });
      } else {
        console.log("res wasn't true lol")
      }
    } else if (user_type === "Employee") {
      ownerFirst = req.body.ownerFN;
      ownerLast = req.body.ownerLN;
      console.log("OwnerFN: ", ownerFirst, "/nOwnerLN: ", ownerLast)
      const { petName, petType, petBreed, petSex, petDOB, petWeight} = req.body;
      const result = await pet.addPet(petName, petType, petBreed, petSex, petDOB, petWeight, ownerFirst, ownerLast);
      if (result ===true){
        res.render("pages/add_pets", { type: user_type, message: "Successfully added Pet", ownerFN: "", ownerLN: "" });
      }
      else {
        console.log("res wasn't true lol")
      }
    }
  } catch (error) {
    console.error("Error adding pet:", error);
    res.status(500).send(
      '<script> alert("Internal Server Error"); </script>'+
      '<script> window.location.href = "/"; </script>'
    );
    //res.status(500).send("Internal Server Error");
  }
});

app.get("/emp_employees", (req,res) => {
  const user = req.session.user;
  const user_type = req.session.type; 
  if(user) {
    res.render("pages/emp_employees", {user: user, type: user_type});
  } else {
    res.redirect("/login")
  }
  
});

let currentPage = 1;
const pageSize = 10;

app.get("/emp_clients_search", async (req,res) => {
  try {
    const result = await client.getAllClients(currentPage, pageSize);
    res.render("pages/emp_clients_search", { clients: result, currentPage });
  } catch (error) {
    res.status(500).send(
      '<script> alert("Internal Server Error"); </script>'+
      '<script> window.location.href = "/emp_clients"; </script>'
    );
    //res.status(500).json({ message: error.message });
    //res.redirect('/emp_clients');
  }
});

app.get("/emp_clients_search/next", async (req, res) => {
  currentPage+=pageSize;
  res.redirect('/emp_clients_search');
});

app.get("/emp_clients_search/previous", async (req, res) => {
  if (currentPage > 1) {
    currentPage-=pageSize;
  }
  res.redirect('/emp_clients_search');
});

app.get("/emp_clients_edit", async (req, res) => {
  const clientId = req.query.clientId;
  try {
    const found_client = await client.getClientById(parseInt(clientId)); // Fetch the client data
    if (!found_client) {
      return res.status(404).send(
        '<script> alert("Client not found"); </script>'+
        '<script> window.location.href = "/emp_clients"; </script>'
      );
      //return res.status(404).send("Client not found");
    }
    res.render("pages/emp_clients_edit", { found_client: found_client }); // Pass the client data to the template
  } catch (error) {
    console.error("Error fetching client data:", error);
    res.status(500).send(
      '<script> alert("Internal Server Error); </script>'+
      '<script> window.location.href = "/"; </script>'
    );
  }
});

// Delete client
app.post("/delete_client/:clientID", async (req, res) => {
  const clientID = req.params.clientID;

  try {
    // Delete the client from the database
    const result = await client.removeClient(clientID)
    // Client deleted successfully
    if(result) {
      res.status(200).send(
        '<script> alert("Client deleted successfully"); </script>'+
        '<script> window.location.href = "/emp_clients"; </script>'
      );
      //res.status(200).send("Client deleted successfully");
    } else {
      console.log("Error")
    }
  } catch (error) {
    console.error("Error deleting client:", error);
    res.status(500).send(
      '<script> alert("Internal Server Error"); </script>'+
      '<script> window.location.href = "/"; </script>'
    );
    //res.status(500).send("Internal Server Error");
  }
});

// Update client information
app.post("/update_client/:clientID", async (req, res) => {
  const clientID = req.params.clientID;
  const { clientFN, clientLN, clientEmail, clientPhone } = req.body;

  try {
    // Update the client information in the database
    const result = client.editClient(clientID, clientFN, clientLN, clientPhone, clientEmail)
    if(result) {
      res.redirect("/emp_clients_search");
    } else {
      console.log("Error Updating Client")
      res.redirect("/update_client/:clientID")
    }
  } catch (error) {
    console.error("Error updating client:", error);
    res.status(500).send(
      '<script> alert("Internal Server Error"); </script>'+
      '<script> window.location.href = "/"; </script>'
    );
    //res.status(500).send("Internal Server Error");
  }
});

let currentPage_pets = 1;
const pageSize_pets = 10;

app.get("/pets_search", async (req,res) => {
  const user_type = req.session.type;
  if(user_type == 'Employee') {
    try {
    const pet_records = await pet.getPets(currentPage_pets, pageSize_pets, user_type, '');
    const ownerIDs = pet_records.map(pet => pet.ownerID);
    const pet_owners = await client.getClientsByID(ownerIDs);
    const pet_owners_name = pet_owners.map(pet_owner => `${pet_owner.clientFN} ${pet_owner.clientLN}`);
    res.render("pages/pets_search", { pets: pet_records, owner_names: pet_owners_name, currentPage_pets, type: user_type});
    } catch (error) {
      res.status(500).send(
        '<script> alert("Internal Server Error"); </script>'+
        '<script> window.location.href = "/"; </script>'
      );
      //res.status(500).json({ message: error.message });
    }
  }
  else if(user_type == 'Client') {
    const owner_id = parseInt(req.session.user.clientID);
    const pet_records = await pet.getPets(currentPage_pets, pageSize_pets, user_type, owner_id);
    res.render("pages/pets_search", { pets: pet_records, currentPage_pets, type: user_type});

  }
  else {
    console.log("user_type")
  }
});

app.get("/pets_search/next", async (req, res) => {
  currentPage_pets+=pageSize_pets;
  res.redirect('/pets_search');
});

app.get("/pets_search/previous", async (req, res) => {
  if (currentPage_pets > 1) {
    currentPage_pets-=pageSize_pets;
  }
  res.redirect('/pets_search');
});

app.get("/pets_edit", async (req, res) => {
  const petId = req.query.petId;
  try {
    const found_pet = await pet.getPetById(parseInt(petId)); // Fetch the client data
    if (!found_pet) {
      return res.status(404).send(
        '<script> alert("Pet not found"); </script>'+
        '<script> window.location.href = "/pets"; </script>'
      );
      //return res.status(404).send("Pet not found");
    }
    res.render("pages/pets_edit", { found_pet: found_pet, message: "" }); // Pass the client data to the template
  } catch (error) {
    console.error("Error fetching pet data:", error);
    res.status(500).send(
      '<script> alert("Internal Server Error"); </script>'+
      '<script> window.location.href = "/"; </script>'
    );
    //res.status(500).send("Internal Server Error");
  }
});


// Delete pet
app.post("/delete_pet/:petID", async (req, res) => {
  const petID = req.params.petID;

  try {
    // Delete the client from the database
    const result = await pet.removePet(petID);
    if(result) {
      res.redirect("/pets_search")
    } else {
      res.status(200).send(
        '<script> alert("Unsuccessful pet deletion"); </script>'+
        '<script> window.location.href = "/pets"; </script>'
      );
      //res.status(200).send("Unsuccessful pet deletion");
    }
  } catch (error) {
    console.error("Error deleting pet:", error);
    res.status(500).send(
      '<script> alert("Internal Server Error"); </script>'+
      '<script> window.location.href = "/"; </script>'
    );
    //res.status(500).send("Internal Server Error");
  }
});

// Update pet information
app.post("/update_pet/:petID", async (req, res) => {
  const petID = req.params.petID;
  const { petName, petType, petBreed, petSex, petDOB, petWeight } = req.body;

  try {
    // Update the pet information in the database
    const result = await pet.editPet(petID, petName, petType, petBreed, petSex, petDOB, petWeight);
    if (result) {
      res.status(200).send(
        '<script> alert("Pet updated successfully"); </script>'+
        '<script> window.location.href = "/pets"; </script>'
      );
      //res.status(200).send("Pet updated successfully");
    } else {
      // If the result is false, it means the pet was not found or the update failed
      res.status(400).send(
        '<script> alert("Failed to update pet"); </script>'+
        '<script> window.location.href = "/transactions"; </script>'
      );
      //res.status(400).send("Failed to update pet");
    }
  } catch (error) {
    console.error("Error updating pet:", error);
    res.status(500).send(
      '<script> alert("Internal Server Error"); </script>'+
      '<script> window.location.href = "/"; </script>'
    );
    //res.status(500).send("Internal Server Error");
  }
});

let currentPage_trans = 1;
const pageSize_trans = 10;

app.get("/transactions_search", async (req,res) => {
  try {
    const user_type = req.session.type;
    const user = req.session.user
    if(user_type == 'Employee') {
      const trans_records = await transaction.getTrans(currentPage_trans, pageSize_trans, user_type, '');
      const clientIDs = trans_records.map(tran => tran.clientID);
      const trans_clients = await client.getClientsByID(clientIDs);
      const trans_clients_name = trans_clients.map(trans_client => `${trans_client.clientFN} ${trans_client.clientLN}`);
  
      res.render("pages/transactions_search", { trans: trans_records, client_names: trans_clients_name, currentPage_trans, type: user_type});
    }
    else if(user_type == 'Client') {

      const client_id = parseInt(req.session.user.clientID);
      const client_record = await client.getClientById(client_id);
      const clientName = `${client_record.clientFN} ${client_record.clientLN}`;
      const trans_records = await transaction.getTrans(currentPage_trans, pageSize_trans, user_type, client_id);
  
      res.render("pages/transactions_search", { trans: trans_records, client_name: clientName, currentPage_trans, type: user_type});
    } 
  }catch(error) {
    res.status(500).send(
      '<script> alert("Internal Server Error"); </script>'+
      '<script> window.location.href = "/"; </script>'
    );
    //res.status(500).json({ message: error.message });
  }
  // else {}
});

app.get("/transactions_search/next", async (req, res) => {
  currentPage_trans += pageSize_trans;
  res.redirect('/transactions_search');
  // const trans_records = await getTrans(currentPage_trans, pageSize_trans, user_type, '');
  // const clientIDs = trans_records.map(tran => tran.clientID);
  // const trans_clients = await Client.find({ clientID: { $in: clientIDs } , activeFlag:true});
  // const trans_clients_name = trans_clients.map(trans_client => `${trans_client.clientFN} ${trans_client.clientLN}`);
  // res.render("pages/transactions_search", { trans: trans_records, client_names: trans_clients_name, currentPage_trans, type: user_type});
});

app.get("/transactions_search/previous", async (req, res) => {
  if (currentPage_trans > 1) {
    currentPage_trans-=pageSize_trans;
  }
  res.redirect('/transactions_search');

});


app.get("/transactions_edit", async (req, res) => {
  const transId = req.query.TID;
  try {
    const found_trans = await transaction.getTranById(parseInt(transId)); // Fetch the client data
    const clientName = req.query.client;
    if (!found_trans) {
      res.status(404).send(
        '<script> alert("Transaction not found"); </script>'+
        '<script> window.location.href = "/transactions"; </script>'
      );
      return res.status(404).send("Transaction not found");
    }
    res.render("pages/transactions_edit", { found_trans: found_trans , client_name: clientName}); // Pass the client data to the template
  } catch (error) {
    console.error("Error fetching transaction data:", error);
    res.status(500).send(
      '<script> alert("Internal Server Error"); </script>'+
      '<script> window.location.href = "/"; </script>'
    );
    //res.status(500).send("Internal Server Error");
  }
});

// Update transaction information
app.post("/update_transaction/:TID", async (req, res) => {
  const tranID = req.params.TID;
  const transAmount = req.body.totalAmount_usd;

  try {
    const result = await transaction.updateTransaction(tranID, transAmount);
    if (!result) {
      return res.status(404).send(
        '<script> alert("Transaction not found"); </script>'+
        '<script> window.location.href = "/transactions"; </script>'
      );
      //return res.status(404).send("Transaction not found");
    }
    res.status(200).send(
      '<script> alert("Transaction updated successfully"); </script>'+
      '<script> window.location.href = "/transactions"; </script>'
    );
    //res.status(200).send("Transaction updated successfully");
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).send(
      '<script> alert("Internal Server Error"); </script>'+
      '<script> window.location.href = "/"; </script>'
    );
    //res.status(500).send("Internal Server Error");
  }
});

let currentPage_res = 1;
const pageSize_res = 10;

app.get("/reservations_search", async (req,res) => {
  try {
    const user_type = req.session.type;
    const user = req.session.user
    if(user_type == 'Employee') {
      const res_records = await reservation.getRes(currentPage_res, pageSize_res, user_type, '');
      const clientIDs = res_records.map(res => res.clientID);
      const res_clients = await client.getClientsByID(clientIDs);
      const pet_IDs = res_records.map(res => res.petID);
      const pets = await pet.getPetNamesByID(pet_IDs);
      const res_clients_name = res_clients.map(res_client => `${res_client.clientFN} ${res_client.clientLN}`);
  
      res.render("pages/reservations_search", { res: res_records, client_names: res_clients_name, currentPage_res, type: user_type, petNames: pets});
    }
    else if(user_type == 'Client') {

      const client_id = parseInt(req.session.user.clientID);
      const client_record = await client.getClientById(client_id);
      const clientName = `${client_record.clientFN} ${client_record.clientLN}`;
      const res_records = await reservation.getRes(currentPage_res, pageSize_res, user_type, client_id);
      const pet_IDs = res_records.map(res => res.petID);
      const pets = await pet.getPetNamesByID(pet_IDs);
      res.render("pages/reservations_search", { res: res_records, client_name: clientName, currentPage_res, type: user_type, petNames: pets});
    } 
  }catch(error) {
    console.log(error)
    res.status(500).send(
      '<script> alert("Internal Server Error"); </script>'+
      '<script> window.location.href = "/"; </script>'
    );
    //res.status(500).json({ message: error.message });
  }
  // else {}
});

app.get("/reservations_search/next", async (req, res) => {
  currentPage_res += pageSize_res;
  res.redirect('/reservations_search');
});

app.get("/reservations_search/previous", async (req, res) => {
  if (currentPage_res > 1) {
    currentPage_res-=pageSize_res;
  }
  res.redirect('/reservations_search');

});

let currentPage_emp = 1;
const pageSize_emp = 10;

app.get("/employees_search", async (req,res) => {
  try {
    const user_type = req.session.type;
    const user = req.session.user;
    if(user_type == 'Employee') {
      const emps_records = await employee.getEmps(currentPage_emp, pageSize_emp, user_type, user.empID);
  
      res.render("pages/employees_search", { emps: emps_records, currentPage_trans, type: user_type});
    }
  }catch(error) {
    res.status(500).send(
      '<script> alert("Internal Server Error"); </script>'+
      '<script> window.location.href = "/"; </script>'
    );
    //res.status(500).json({ message: error.message });
  }
  // else {}
});

app.get("/employees_search/next", async (req, res) => {
  currentPage_emp += pageSize_emp;
  res.redirect('/employees_search');
});

app.get("/employees_search/previous", async (req, res) => {
  if (currentPage_emp > 1) {
    currentPage_emp-=pageSize_emp;
  }
  res.redirect('/employees_search');

});

const PORT = process.env.PORT;
module.exports = app;
app.listen(PORT, () => console.log(`Now Listening on port ${PORT}`));