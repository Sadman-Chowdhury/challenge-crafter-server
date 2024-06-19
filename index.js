const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

// -------------------middleware----------------------------------------------------------------
const corsOptions = {
  origin: ["https://challenge-crafter.web.app"],
  // origin: ["http://localhost:5173"],
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(bodyParser.json());

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

    const paymentCollection = client
      .db("ChallengeCrafter")
      .collection("Payment");

    const contestWinnerCollection = client
      .db("ChallengeCrafter")
      .collection("Winner");

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
            { $set: user },
            options
          );
          return res.send(result);
        } else {
          return res.send(isExist);
        }
      }

      const result = await usersCollection.updateOne(
        query,
        { $set: { ...user, timestamp: Date.now() } },
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
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;

      if (user) {
        admin = user?.role == "admin";
      }
      res.send({ admin });
    });
    app.get("/users/creator/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let creator = false;

      if (user) {
        creator = user?.role == "creator";
      }
      res.send({ creator });
    });
    // ====================all contest=============================================
    app.get("/AllContest", async (req, res) => {
      const result = await AllContestsCollection.find().toArray();
      res.send(result);
      console.log(result);
    });

    app.get("/AllContest/imageDesign", async (req, res) => {
      const query = { contestType: "Image Design" };
      const result = await AllContestsCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/AllContest/marketingStrategy", async (req, res) => {
      const query = { contestType: "Marketing Strategy" };
      const result = await AllContestsCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/AllContest/articleWriting", async (req, res) => {
      const query = { contestType: "Article Writing" };
      const result = await AllContestsCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/AllContest/digitalAdvertis", async (req, res) => {
      const query = { contestType: "Digital advertisement" };
      const result = await AllContestsCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/AllContest/gamingReview", async (req, res) => {
      const query = { contestType: "Gaming Review" };
      const result = await AllContestsCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/AllContest/bookReview", async (req, res) => {
      const query = { contestType: "Book Review" };
      const result = await AllContestsCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/addContest", async (req, res) => {
      const Item = req.body;
      const result = await AllContestsCollection.insertOne(Item);
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
    app.get("/AllContests/contestType", async (req, res) => {
      const { contestType } = req.query;
      try {
        const result = await AllContestsCollection.find({
          contestType: { $regex: new RegExp(`^${contestType}`, "i") },
        }).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching contests", error);
        res.status(500).send({ error: "Error fetching contests" });
      }
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
    app.patch("/allContest/accepted/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "accepted",
        },
      };
      const result = await AllContestsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.patch("/allContest/comment/:id", async (req, res) => {
      const { id } = req.params;
      const { comment } = req.body;

      try {
        const ObjectId = require("mongodb").ObjectId;
        const contestId = new ObjectId(id);

        const result = await AllContestsCollection.updateOne(
          { _id: contestId },
          { $push: { comments: comment } }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .send({ message: "Contest not found or comment not added" });
        }

        res.send({ modifiedCount: result.modifiedCount });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // ===================================Payment Api==============================================================
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payment", async (req, res) => {
      const payment = req.body;
      try {
        // Insert payment information into the database
        const paymentResult = await paymentCollection.insertOne(payment);
        res.send(paymentResult);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
      }
    });

    app.patch("/updateParticipantsCounts/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await AllContestsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $inc: { participantsCount: 1 } }
        );

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
      }
    });
    app.get("/payment", async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    });
    // ===============================User Dashboard api==================================================================
    app.get("/myParticipatedContestByEmail", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      try {
        const result = await paymentCollection.find(query).toArray();
        res.status(200).send(result);
      } catch (err) {
        res.status(500).send({ message: err.message });
      }
    });
    app.get("/getParticipatedContestData/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await paymentCollection.findOne(query);
      res.send(result);
    });

    app.post("/submit-contest-task", async (req, res) => {
      const { contestId, submissionDetails } = req.body;

      try {
        const contest = await AllContestsCollection.findOne({
          _id: new ObjectId(contestId),
        });

        if (contest) {
          const updateResult = await AllContestsCollection.updateOne(
            { _id: new ObjectId(contestId) },
            { $push: { submissions: submissionDetails } }
          );

          if (updateResult.modifiedCount > 0) {
            res.status(200).json({ message: "Submission successful" });
          } else {
            res.status(500).json({ message: "Failed to update submission" });
          }
        } else {
          res.status(404).json({ message: "Contest not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Server error", error });
      }
    });

    app.post("/postContestWinner", async (req, res) => {
      const winner = req.body;

      try {
        // Insert the winner information into the contestWinnerCollection
        const winnerResult = await contestWinnerCollection.insertOne(winner);

        // Update the respective contest in AllContestsCollection
        const contestId = winner.contestId; // Ensure the winner object has a contestId field
        if (!contestId) {
          return res.status(400).send({ error: "contestId is required" });
        }

        const contestUpdateResult = await AllContestsCollection.updateOne(
          { _id: new ObjectId(contestId) },
          { $set: { winner: winner.winnerInfo } }
        );

        res.send({ winnerResult, contestUpdateResult });
      } catch (error) {
        console.error("Error declaring winner:", error);
        res.status(500).send({ error: "Failed to declare winner" });
      }
    });

    app.get("/getContestWinner", async (req, res) => {
      const result = await contestWinnerCollection.find().toArray();
      res.send(result);
      console.log(result);
    });
    app.get("/winnerContestByEmail", async (req, res) => {
      const email = req.query.email;
      const query = { "winnerInfo.email": email };
      try {
        const result = await contestWinnerCollection.find(query).toArray();
        res.status(200).send(result);
      } catch (err) {
        res.status(500).send({ message: err.message });
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
