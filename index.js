require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
const jwt = require("jsonwebtoken");

// Middlewares
app.use(cors());
app.use(express.json());

// Connecting with mongoDB
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w1xw1.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// console.log(process.env.JWT_SECRET);

// JSON Web token => 1. Header, 2. Payload, 3. Signature
// Create a jwt token
/*
const myToken = jwt.sign(
  {
    name: "Hamid",
  },
  "sasfasdfdsfadsfdsfadsfdsafds",
  {
    expiresIn: "1h",
  },
);
*/

// Middlewares
const verifyToken = (req, res, next) => {
  if (!req.headers?.authorization || !req.headers?.authorization.includes("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized Access!" });
  }

  // Get the token from the request header
  const token = req.headers.authorization.split(" ")[1];

  // Check if the token is not exist
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access!" });
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access!" });
    }
    // Save the "decoded" token payload info into the request "decodedInfo" object
    req.decodedInfo = decoded;
    next();
  });
};

// Main function for our API
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // Databases
    const db = client.db("bistroDB");
    const menuCollection = db.collection("menu");
    const cartCollection = db.collection("carts");
    const reviewCollection = db.collection("reviews");
    const userCollection = db.collection("users");

    // Check if the user is an admin after the token verification (verify admin middleware)
    const verifyAdmin = async (req, res, next) => {
      const email = req.decodedInfo?.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";

      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden Access!" });
      }

      // If the user in an admin
      next();
    };

    // Create a JWT token (POST API ENDPOINT)
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // Generate/sign token
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });

      res.send({ token });
    });

    // Save user's data (POST API endpoint)
    app.post("/users", async (req, res) => {
      const user = req.body;
      // Insert email if the user doesn't exist
      // There are different ways to achieve that (1. unique email, 2. upsert, 3. simple checking)
      const query = { email: user?.email };
      const isUserExist = await userCollection.findOne(query);

      if (isUserExist) {
        return res.send({ message: "User already exists", acknowledged: false, insertedId: null });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Retrieving all users data using GET method
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // Delete a specific user
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const userId = req.params.id;
      const query = { _id: new ObjectId(userId) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // Check if the current user is an "admin"
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };

      // Check is the current user is the same as the decoded user with their email
      if (email !== req.decodedInfo?.email) {
        return res.status(401).send({ message: "Unauthorized access" });
      }

      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";

      res.send({ isAdmin });
    });

    // Update the "ROLE" of a specific user
    app.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      // Upsert = update + insert (if the document exist then update it, otherwise insert it)
      // const options = { upsert: true };

      const result = await userCollection.updateOne(query, updatedDoc);

      res.send(result);
    });

    // Menu related APIs
    // Menu API endpoint
    app.get("/menu", async (req, res) => {
      const cursor = await menuCollection.find().sort({ _id: -1 }).toArray();
      res.send(cursor);
    });

    // Add a new menu item (Admin only)
    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const menuItem = req.body;
      const result = await menuCollection.insertOne(menuItem);
      res.send(result);
    });

    // Delete a new menu item
    app.delete("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      const itemId = req.params.id;
      const query = { _id: new ObjectId(itemId) };
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    });

    // Get a specific menu item based on id
    app.get("/menu/:id", async (req, res) => {
      const itemId = req.params.id;
      console.log(itemId);
      const query = { _id: new ObjectId(itemId) };
      const result = await menuCollection.findOne(query);
      res.send(result);
    });

    // Update menu API
    app.patch("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      const itemId = req.params.id;
      const updatedItem = req.body;
      const filter = { _id: new ObjectId(itemId) };
      const updatedDoc = {
        $set: {
          name: updatedItem.name,
          recipe: updatedItem.recipe,
          image: updatedItem.image,
          category: updatedItem.category,
          price: updatedItem.price,
        },
      };

      console.log(updatedItem);
      const result = await menuCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // Carts (POST API endpoint)
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

    // Delete a cart item (DELETE API endpoint)
    app.delete("/carts/:id", async (req, res) => {
      try {
        const itemId = req.params.id;
        const query = { _id: new ObjectId(itemId) };
        const result = await cartCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(400).send({ error: "Invalid item ID" });
      }
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
