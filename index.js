const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();
app.use(cors());
app.use(express.json());
const jwt = require("jsonwebtoken");
const stripe = require('stripe')(process.env.DB_STRIPE_KEY)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dibths0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    const database = client.db("grant-genius");
    const bannerCollection = database.collection("banner");
    const userCollection = database.collection("user");
    const scholarshipCollection = database.collection("new-scholarship");
    const appliedScholarshipCollection = database.collection("applied-test-scholarship");
    const reviewCollection = database.collection("review");

    //jwt related api
    app.post('/jwt',async(req,res)=>{
      const user = req.body
      const token = jwt.sign(user,process.env.DB_ACCESS_TOKENS,{expiresIn: '1h'})
      res.send({token})
    })

    //token verification
    const verifyToken=(req,res,next)=>{
      if(!req.headers.authorization){
        console.log('err in 1st verify token')
        return res.status(401).send({message: 'unauthorized access'})
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.DB_ACCESS_TOKENS,(err, decoded)=>{
        if(err){
          console.log('err in verify token')
          return res.status(401).send({message: 'unauthorized access'})
        }
        req.decoded=decoded
        next()
      })
    }
    const verifyAdmin =async(req,res,next)=>{
      const email =req.decoded.email
      console.log('email in verify admin',email)
      const query ={email: email}
      const user = await userCollection.findOne(query)
      const isAdmin = user?.role === 'admin'
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'})
      }
      next()
    }
    const verifyModerator =async(req,res,next)=>{
      const email =req.decoded.email
      //console.log('email in verify moderator',email)
      const query ={email: email}
      const user = await userCollection.findOne(query)
      const isModerator = user?.role === 'moderator'
      if(!isModerator){
        return res.status(403).send({message: 'forbidden access'})
      }
      next()
    }
    app.get('/user/admin/:email',verifyToken,async(req,res)=>{
      const email =req.params.email
      if(email !==req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const query= {email: email}
      const user = await userCollection.findOne(query)
      let admin =false
      if(user){
        admin = user?.role === 'admin'
      }
      res.send({admin})
  })
    app.get('/user/moderator/:email',verifyToken,async(req,res)=>{
      const email =req.params.email
      //console.log('moderator')
      if(email !==req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const query= {email: email}
      const user = await userCollection.findOne(query)
      //console.log(user.role, '100')
      let moderator =false
      if(user){
        moderator = user?.role === 'moderator'
      }
      //console.log(moderator)
      res.send({moderator})
  })
    app.post('/applied-scholarship',async(req,res)=>{
        const appliedScholarship = req.body;
        const result = await appliedScholarshipCollection.insertOne(appliedScholarship)
        res.send(result)
    })
    app.get('/all-applied-scholarship',verifyToken,verifyModerator,async(req,res)=>{
      const result = await appliedScholarshipCollection.find().toArray()
      res.send(result)
    })
    app.patch('/applied-application-feedback/:id',verifyToken,verifyModerator,async(req,res)=>{
      const id = req.params.id
      const filter = {_id : new ObjectId(id)}
      const feedbackData =req.body
      const updateDoc ={
        $set: {
          feedback : feedbackData.feedback
        }
      }
      const result = await appliedScholarshipCollection.updateOne(filter,updateDoc)
      res.send(result)
    })
    app.get('/all-reviews',async(req,res)=>{
      const result = await reviewCollection.find().toArray()
      res.send(result)
    })
    app.patch('/applied-application-status/:id',verifyToken,verifyModerator,async(req,res)=>{
      const id = req.params.id
      const filter = {_id : new ObjectId(id)}
      const statusData =req.body
      console.log()
      const updateDoc ={
        $set: {
          status : statusData.status
        }
      }
      const result = await appliedScholarshipCollection.updateOne(filter,updateDoc)
      res.send(result)
    })
    app.get('/applied-scholarships',async(req,res)=>{
      let query ={}
      console.log(req.query.email)
      if(req.query?.email){
        query ={userEmail: req.query.email}
      }
      console.log(query)
      //console.log('hitting')
      const cursor = appliedScholarshipCollection.find(query)
      const result = await cursor.toArray()
      res.send(result) 
    })
    app.delete('/applied-scholarship-delete/:id',async(req,res)=>{
      const id= req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await appliedScholarshipCollection.deleteOne(query)
      res.send(result)
    })
    app.delete('/review-delete/:id',verifyToken,verifyModerator,async(req,res)=>{
      const id = req.params.id
      const query ={_id: new ObjectId(id)}
      const result = await reviewCollection.deleteOne(query)
      res.send(result)
    })
    app.get('/reviews',async(req,res)=>{
      let query ={}
      console.log(parseInt(req.query.scholarshipId))
      if(req.query?.scholarshipId){
        query ={scholarshipId: parseInt(req.query.scholarshipId)}
      }
      console.log('hello hello',query)
      const result = await reviewCollection.find(query).toArray()
      res.send(result)
    })
    app.get("/applied-scholarship/:id", async (req, res) => {
      const id = req.params.id
      console.log({id})
      const query = { _id: new ObjectId(id) }
      console.log(query)
      const result = await appliedScholarshipCollection.findOne(query)
      res.send(result)
    });
    app.patch('/applied-scholarship/:id',async (req,res)=>{
      const scholarshipData = req.body
      const id =req.params.id
      const filter ={_id: new ObjectId(id)}
      const updateDoc ={
        $set: {
        universityLocation : scholarshipData.universityLocation,
        applicationFees : scholarshipData.applicationFees,
        serviceCharge : scholarshipData.serviceCharge,
        applicantName : scholarshipData.applicantName,
        userId : scholarshipData.userId,
        userEmail : scholarshipData.userEmail,
        phoneNumber : scholarshipData.phoneNumber,
        photo : scholarshipData.photo,
        address : scholarshipData.address,
        gender : scholarshipData.gender,
        degree : scholarshipData.degree,
        sscResult : scholarshipData.sscResult,
        hscResult : scholarshipData.hscResult,
        studyGap : scholarshipData.studyGap,
        universityName : scholarshipData.universityName,
        scholarshipCategory : scholarshipData.scholarshipCategory,
        subjectName : scholarshipData.subjectName
        }
      }
      const result = await appliedScholarshipCollection.updateOne(filter,updateDoc)
      res.send(result)
    })
    app.get("/banner", async (req, res) => {
      const result = await bannerCollection.find().toArray();
      res.send(result);
    });
    app.get("/all-scholarship", async (req, res) => {
      const result = await scholarshipCollection.find().toArray();
      console.log("test");
      res.send(result);
    });
    app.get("/all-scholarship/:id", async (req, res) => {
        const id = req.params.id
        console.log({id})
        const newId = parseInt(id)
        const query = { scholarshipId: newId }
        console.log(query)
        const result = await scholarshipCollection.findOne(query)
        res.send(result)
      });
    app.get("/all-scholarships/:id", async (req, res) => {
        const id = req.params.id
       
        const query = { _id: new ObjectId(id) }
        console.log(query)
        const result = await scholarshipCollection.findOne(query)
        res.send(result)
      });
    app.post("/user", async (req, res) => {
      const userInfo = req.body;
      const query = { email: userInfo.email };
      const existUser = await userCollection.findOne(query);
      if (existUser) {
        return res.send({ message: "already exist", insertId: null });
      }
      const result = await userCollection.insertOne(userInfo);
      res.send(result);
    });
    app.get("/users",verifyToken,verifyAdmin,async(req,res)=>{
      const result =await userCollection.find().toArray()
      res.send(result)
    })
    app.delete("/user/:id",verifyToken,verifyAdmin,async(req,res)=>{
      const id =req.params.id
      const filter = {_id : new ObjectId(id)}
      const result = await userCollection.deleteOne(filter)
      res.send(result)
    })
    app.post('/all-scholarship',verifyToken,verifyModerator,async(req,res)=>{
        const scholarshipData= req.body
        const result = await scholarshipCollection.insertOne(scholarshipData)
        res.send(result)
    })
    app.delete("/all-scholarship-delete/:id",verifyToken,verifyModerator,async(req,res)=>{
      const id =req.params.id
      const filter = {_id : new ObjectId(id)}
      const result = await scholarshipCollection.deleteOne(filter)
      res.send(result)
    })
    app.patch("/user-role/:id",verifyToken,verifyAdmin,async (req,res)=>{
      const userRole =req.body
      console.log(userRole)
      const id =req.params.id
      const filter = {_id : new ObjectId(id)}
      const updateDoc ={
        $set :{
          role: userRole.role
        }
      }
      const result = await userCollection.updateOne(filter,updateDoc)
      res.send(result)
    })
    app.post("/review",async(req,res)=>{
      const reviewData =req.body
      const result = await reviewCollection.insertOne(reviewData)
      res.send(result)
    })
    app.get("/review",async(req,res)=>{
      const email= req.query.email
      const query = {email: email}
      const result = await reviewCollection.find(query).toArray()
      res.send(result)
    })
    app.delete("/review-delete/:id",async(req,res)=>{
      const id =req.params.id
      const query={_id : new ObjectId(id)}
      const result = await reviewCollection.deleteOne(query)
      res.send(result)
    })
    app.get("/single-review/:id",async(req,res)=>{
      const id =req.params.id
      const query ={_id: new ObjectId(id)}
      const result = await reviewCollection.findOne(query)
      res.send(result)
    })
    app.patch("/edit-review/:id",async(req,res)=>{
      const id = req.params.id
      const reviewData =req.body
      const filter ={_id: new ObjectId(id)}
      //console.log('test',filter)
      const updateDoc ={
        $set: {
          userName: reviewData.userName,
          userImg: reviewData.userImg,
          email: reviewData.email,
          review: reviewData.review,
          rating: reviewData.rating,
          universityName: reviewData.universityName,
          scholarshipName: reviewData.scholarshipName,
          scholarshipId: reviewData.scholarshipId
        }
      }
      const result = await reviewCollection.updateOne(filter,updateDoc)
      res.send(result)
    })
    app.patch("/all-scholarship/:id",async(req,res)=>{
      const id = req.params.id
      const scholarshipData =req.body
      const filter ={_id: new ObjectId(id)}
      console.log('test',filter)
      const updateDoc ={
        $set: {
          universityName: scholarshipData.universityName,
          scholarshipCategory: scholarshipData.scholarshipCategory,
          stipend: scholarshipData.stipend,
          universityLogo: scholarshipData.universityLogo,
          scholarshipName: scholarshipData.scholarshipName,
          scholarshipDescription: scholarshipData.scholarshipDescription,
          serviceCharge: scholarshipData.serviceCharge,
          applicationFees: scholarshipData.applicationFees,
          applicationDeadline: scholarshipData.applicationDeadline,
          universityLocation :{
            city: scholarshipData.universityLocation.city,
            country: scholarshipData.universityLocation.country,
          }
        }
      }
      const result = await scholarshipCollection.updateOne(filter,updateDoc)
      res.send(result)
    })
    app.post('/create-payment-intent',async(req,res)=>{
      const {price}=req.body
      const amount = parseInt(price * 100)
      console.log(price)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("grant genius server");
});

app.listen(port, () => {
  console.log(`the app listening on port ${port}`);
});
