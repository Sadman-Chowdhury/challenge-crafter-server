const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;

// -------------------middleware----------------------------------------------------------------
const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

// =================================================================

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.scfrsgh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // =====================all collection============================================

    const usersCollection = client.db("ChallengeCrafter").collection("users");
    const AllContestsCollection = client
      .db("ChallengeCrafter")
      .collection("AllContest");

    // =================================================================

    // Save or modify user email, status in DB
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email: email };
      const options = { upsert: true };
      const isExist = await usersCollection.findOne(query);
      console.log("User found?----->", isExist);
      if (isExist) {
        if (user?.status === "Requested") {
          const result = await usersCollection.updateOne(
            query,
            {
              $set: user,
            },
            options
          );
          return res.send(result);
        } else {
          return res.send(isExist);
        }
      }
      const result = await usersCollection.updateOne(
        query,
        {
          $set: { ...user, timestamp: Date.now() },
        },
        options
      );
      res.send(result);
    });

    // ====================all contest=============================================
    app.get("/AllContest", async (req, res) => {
      const result = await AllContestsCollection.find().toArray();
      res.send(result);
      console.log(result);
    });

    app.get("/AllContest/coding", async (req, res) => {
      const query = { contestType: "coding" };
      const result = await AllContestsCollection.find(query).toArray();
      res.send(result);
      // console.log(result);
    });
    app.get("/AllContest/design", async (req, res) => {
      const query = { contestType: "design" };
      const result = await AllContestsCollection.find(query).toArray();
      res.send(result);
      // console.log(result);
    });
    app.get("/AllContest/writing", async (req, res) => {
      const query = { contestType: "writing" };
      const result = await AllContestsCollection.find(query).toArray();
      res.send(result);
      // console.log(result);
    });
    app.get("/AllContest/AI", async (req, res) => {
      const query = { contestType: "AI" };
      const result = await AllContestsCollection.find(query).toArray();
      res.send(result);
      // console.log(result);
    });
    // =================================================================================================

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// =================================================================

// ---------------------------------------------------------------------------------------------
app.get("/", (req, res) => {
  res.send("Challenge Crafter Server is Alive.............");
});

app.listen(port, () => {
  console.log(`Challenge Crafter Server is running on port ${port}`);
});
