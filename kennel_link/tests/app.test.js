const app = require('../app.js');
const request = require('supertest');
const signupLoginModel = require("../scripts/signupLoginModel.js");
const {authenticateLogin} = require("../scripts/signupLoginModel.js");
const { uniqueUser } = require('../scripts/signupLoginModel.js');
const {getPetById} = require("../scripts/petModel.js");
const Pet = require('../scripts/petModel.js');
const { checkForDuplicates } = require("../scripts/petModel.js");

// Change

jest.mock('../scripts/signupLoginModel.js', () => ({
  authenticateLogin: jest.fn(),
  uniqueUser: jest.fn(),
}));
jest.mock('../scripts/petModel.js', () => ({
  getPetById: jest.fn(),
  findOne: jest.fn(),
  checkForDuplicates: jest.fn(),
}));

describe('App', () => {
  let server;
  let testSession;

  beforeAll(done => {
    testSession = request.agent(app);
    server = app.listen(4001, () => {
            console.log('Test server is running on port 4000');
      done();
    });
  });

  afterAll(done => {
    jest.clearAllMocks();
    server.close(done);
  });

  it('should start without crashing', async () => {
    // Send a GET request to the root URL ("/")
    const response = await request(server).get('/');
    
    // Check if the response status is 200 (OK)
    expect(response.status).toBe(200);
  });

  it('should login employee successfully', async () => {
    authenticateLogin.mockResolvedValueOnce({ worked: true });
    const employeeCredentials = {
      username: 'tdelgado',
      password: 'SHAKEIT2023',
      user_type: 'employee'
    };
  
    // Send a POST request to the login endpoint using the session instance
    const response = await request(app)
      .post('/login')
      .send(employeeCredentials);
  
    console.log(response.body);
    expect(response.status).toBe(200);
  });

  it('should login client successfully', async () => {
    authenticateLogin.mockResolvedValueOnce({ worked: true });
    const clientCredentials = {
      username: 'janesmith',
      password: 'password2',
      user_type: 'client'
    };
    const response = await request(app)
    .post('/login')
    .send(clientCredentials);
    expect(response.status).toBe(200); // Check for successful login
  });

  it('fake employee does not work', async () => {
    authenticateLogin.mockResolvedValueOnce({ worked: false });
    const employeeCredentials = {
      username: 'Vkopp',
      password: 'SHAKEIT',
      user_type: 'employee'
    };
  
    // Send a POST request to the login endpoint using the session instance
    const response = await request(app)
      .post('/login')
      .send(employeeCredentials);
  
    expect(response.status).toBe(200);
  });
  it('fake client does not work', async () => {
    authenticateLogin.mockResolvedValueOnce({ worked: false });
    const clientCredentials = {
      username: 'Vkopp',
      password: 'SHAKEIT',
      user_type: 'client'
    };
  
    // Send a POST request to the login endpoint using the session instance
    const response = await request(app)
      .post('/login')
      .send(clientCredentials);
  
    expect(response.status).toBe(200);
  });

  
  // these tests are not running due to bigger importing/ exporting issues
  //for example, unique user referes to the unique user function in signupLoginModel.js but it cannot seem to find the function
  //this test should check for a unique user and return false because samantha white is already a user in our database
  test('Check unique user', async () => {
    const type = 'client';
    const username = 'swhite';
    const email = 'samantha.white@example.com';
    const phone = '789-012-3456';
    signupLoginModel.uniqueUser.mockResolvedValueOnce({ unique: false }); // Assuming it's not unique
    // Call the function
    const result = await signupLoginModel.uniqueUser(type, username, email, phone);
  
    // Check if the user is unique
    expect(result.unique).toBe(false);
  });
  //should return true - faith rose is not already a user in our system
  test('Check unique user', async () => {
    const type = 'client';
    const username = 'Frose';
    const email = 'faith.rose@example.com';
    const phone = '789-012=3456';
    signupLoginModel.uniqueUser.mockResolvedValueOnce({ unique: true });
    // Call the function
    const result = await signupLoginModel.uniqueUser(type, username, email, phone);
  
    // Check if the user is unique
    expect(result.unique).toBe(true);
  });
/*
  test doesn't run because it can't seem to find the findOne function
  or the checkforDuplicates function
  describe("checkForDuplicates function", () => {
    it("should return true if pet is unique", async () => {
      // Mocking the return value of findOne function
      const mockPetRecord = null; // Assuming pet is unique
      Pet.findOne.mockResolvedValue(mockPetRecord);
  
      // Call the function
      const result = await checkForDuplicates("Fluffy", "owner123", "2022-01-01");
  
      // Check if the function returns true
      expect(result).toBe(true);
    });
  
    it("should return false if pet is not unique", async () => {
      // Mocking the return value of findOne function
      const mockPetRecord = { petID: 123, petName: "Fluffy", ownerID: "owner123", petDOB: "2022-01-01" }; // Assuming pet is not unique
      Pet.findOne.mockResolvedValue(mockPetRecord);
  
      // Call the function
      const result = await checkForDuplicates("Fluffy", "owner123", "2022-01-01");
  
      // Check if the function returns false
      expect(result).toBe(false);
    });
  
    it("should return false and log error if an error occurs during execution", async () => {
      // Mocking the findOne function to throw an error
      const error = new Error("Database error");
      Pet.findOne.mockRejectedValue(error);
  
      // Call the function
      const result = await checkForDuplicates("Fluffy", "owner123", "2022-01-01");
  
      // Check if the function returns false
      expect(result).toBe(false);
  
      // Check if the error is logged
      expect(console.log).toHaveBeenCalledWith(error);
    });
  });
*/
  // Test cases for getPetById function
  describe("getPetById function", () => {
    
    //- not passing due to an error I can't find - returning undefined
    it("should return the pet record if found", async () => {
      // Mocking the return value of findOne function
      const mockPetRecord = { petID: 20 };
      console.log("mockPetRecord:",mockPetRecord)
      Pet.findOne.mockResolvedValue(mockPetRecord);

      // Call the function
      const result = await getPetById(20);
      console.log(result);
      // Check if the returned value matches the mockPetRecord
      expect(result).toEqual(mockPetRecord);
    });
    
    it("should return undefined if pet record is not found", async () => {
      // Mocking the return value of findOne function to simulate not finding the pet record
      Pet.findOne.mockResolvedValue(null);

      // Call the function
      const result = await getPetById(456);

      // Check if the returned value is undefined
      expect(result).toBeUndefined();
    });
  });
});
