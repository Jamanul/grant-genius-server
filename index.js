const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require('dotenv').config()
app.use(cors())
app.use(express.json())
const jwt = require('jsonwebtoken')



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dibths0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const database = client.db("grant-genius");
    const bannerCollection = database.collection("banner");
    const userCollection = database.collection("user");
    const scholarshipCollection = database.collection("scholarship");

    //jwt related api
    app.post('/jwt',async (req,res)=>{
        const userInfo =req.body;
        const token =jwt.sign(userInfo,process.env.DB_ACCESS_TOKEN,{expiresIn: '1h'})
        res.send({token})
    })
    //token verification
    const verifyToken = (req,res,next)=>{
        if(!req.headers.authorization){
            return res.status(401).send({message: 'unauthorized access'})
        }
        const token = req.headers.authorization.split(' ')[1]
        jwt.verify(token,process.env.DB_ACCESS_TOKEN,(err,decoded)=>{
            if(err){
                return res.status(401).send({message: 'unauthorized access'})
            }
            req.decoded=decoded
            next()
        })
    }

    app.get('/banner',async(req,res)=>{
        const result = await bannerCollection.find().toArray()
        res.send(result)
    })
    app.get('/all-scholarship',async(req,res)=>{
        const result =await scholarshipCollection.find().toArray()
        res.send(result)
    })
    app.get('/scholarship/:id',verifyToken,async(req,res)=>{
        const id = req.params.id;
        //console.log({id})
        const query ={_id: new ObjectId(id)}
        const result = await scholarshipCollection.findOne(query)
        res.send(result)
    })
    app.post('/user',async(req,res)=>{
        const userInfo =req.body
        const query ={email: userInfo.email}
        const existUser =await userCollection.findOne(query)
        if(existUser){
          return res.send({message:'already exist',insertId: null})
        }
        const result = await userCollection.insertOne(userInfo)
        res.send(result)
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
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
