require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");

// Middlewares
app.use(cors());
app.use(express.json());

// Connecting with mongoDB

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w1xw1.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // Databases
    const db = client.db("bistroDB");
    const menuCollection = db.collection("menu");
    const cartCollection = db.collection("carts");

    // Menu API endpoint
    app.get("/menu", async (req, res) => {
      const cursor = await menuCollection.find().toArray();
      res.send(cursor);
    });

    // Carts POST API endpoint
    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });

    // Carts get API endpoint
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { userEmail: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Root URL
app.get("/", (req, res) => {
  res.send("Hello from the bistro boss server :)");
});

// Start the server
app.listen(port, () => {
  console.log(`Bistro boss server running at ${port}`);
});

// console.log("Hello World");
// console.log("Hi");
// console.log(10 + 15);

// for (let i = 0; i <= 100; i++) {
//   console.log("hi", i);
// }

/*
* ==========================================
  NAMING CONVENTION
  ==========================================
* 
  app.get("/users")
  app.get("/users/:id")
  app.post("/users")
  app.put("/users/:id")
  app.patch("/users/:id")
  app.delete("/users/:id")
*/
