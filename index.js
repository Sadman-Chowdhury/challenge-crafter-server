const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// -------------------middleware----------------------------------------------------------------
const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

// ---------------------------------------------------------------------------------------------
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log(token);
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};
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
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log("I need a new jwt", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });
    // Logout
    app.get("/logout", async (req, res) => {
      try {
        res
          .clearCookie("token", {
            maxAge: 0,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ success: true });
        console.log("Logout successful");
      } catch (err) {
        res.status(500).send(err);
      }
    });
    //===================Save or modify user email, status in DB======================
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
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    app.delete("/deleteUser/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.patch("/users/creator/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "creator",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.patch("/users/user/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "user",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.patch("/users/block/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "block",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.patch("/users/unblock/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "user",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
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
    app.post("/addContest", async (req, res) => {
      const treeItem = req.body;
      const result = await AllContestsCollection.insertOne(treeItem);
      res.send(result);
    });
    app.get("/contestByEmail", async (req, res) => {
      const email = req.query.email;
      const query = { "contestCreator.email": email };
      try {
        const result = await AllContestsCollection.find(query).toArray();
        res.status(200).send(result);
      } catch (err) {
        res.status(500).send({ message: err.message });
      }
    });
    app.get("/getOneContest/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await AllContestsCollection.findOne(query);
      res.send(result);
    });
    app.delete("/deleteContest/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await AllContestsCollection.deleteOne(query);
      res.send(result);
    });
    app.patch("/updateContest/:id", async (req, res) => {
      const { id } = req.params;
      const {
        contestName,
        contestType,
        startDate,
        endDate,
        contestPrice,
        contestPrize,
        description,
        taskSubmissionText,
        status,
        image,
        contestCreator,
      } = req.body;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          contestName,
          contestType,
          startDate,
          endDate,
          contestPrice,
          contestPrize,
          description,
          taskSubmissionText,
          status,
          image,
          contestCreator,
        },
      };
      try {
        const result = await AllContestsCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Failed to update the contest", error });
      }
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
