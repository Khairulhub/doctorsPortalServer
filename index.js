const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT|| 5000;
//jwt token required
const  jwt = require('jsonwebtoken');



//middleware
app.use(cors());
app.use(express.json());

//mogodb connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zmhcerf.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//doctors_portal token verify  function 

function verifyJWT(req, res, next){
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message: 'UnAuthorized access'})
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err,decoded){
    if(err){
      return res.status(403).send({message:'Forbidden access'})
    }
    req.decode = decoded;
    next();
  })
}

//node mongodb api
async function run(){
   try{
    await client.connect();
    const serviceCollection=client.db("doctors_portal").collection("services");
    const bookingCollection=client.db("doctors_portal").collection("bookings");
    const userCollection=client.db("doctors_portal").collection("users");

    //get
    app.get('/service', async(req,res) =>{
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    })


    //user related api
    app.get('/user',verifyJWT, async(req,res) =>{
      const users = await userCollection.find().toArray();
      res.send(users);
    })

    app.get('/admin/:email', async(req,res)=>{
      const email = req.params.email;
      const user = await userCollection.findOne({email:email});
      const isAdmin = user.role === 'admin';

      res.send({admin: isAdmin});
    });
    
    app.put('/user/admin/:email',verifyJWT, async(req,res)=>{
       const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({email:requester})
      if(requesterAccount.role === 'admin'){
        const filter = {email:email};
        const updateDoc = {
           $set:{role:'admin'},
        };
        const result = await userCollection.updateOne(filter,updateDoc);
        res.send(result);
      }
      else{
        res.status(403).send({message:'Forbidden admin'})
      }
    }); 

    //send user to database for new user
    app.put('/user/:email',async(req,res)=>{
       const email = req.params.email;
       const user = req.body;
       const filter = {email: email};
       const options = {upsert:true};
       const updateDoc = {
          $set: user,
       };
       const result = await userCollection.updateOne(filter,updateDoc,options);
       //declear token 
       const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '1h' });  

       res.send({result,token});
    })











    /**
     * Api nameing Convention
     * app.get('/booking')  //get all booking in this collection.
     * app.get('/booking/:id') //get single booking by id.
     * app.post('/booking') //add a new booking
     * app.patch('/booking/:id') //update a booking by id
     * app.delete('/booking/:id') //delete a booking by id
     */

    app.get('/booking',verifyJWT, async(req,res) => {
      const patient = req.query.patient;
      const decodedEmail = req.decode.email;
      if(patient === decodedEmail){
        const query = {patient: patient};
        const bookings = await bookingCollection.find(query).toArray();
        res.send(bookings);
      }
      else{
        return res.status(403).send({message: 'forbidden access'})
      }
    })

        //send data to database from client

    app.post('/booking', async(req,res) =>{
      const booking = req.body;
      const query = {treatment :  booking.treatment , date: booking.date, patient: booking.patient };
      const exists = await bookingCollection.findOne(query);
      if(exists){
        return res.send({success:false, booking: exists});
      }
      const result = await bookingCollection.insertOne(booking);
     return res.send({success: true, result});
    })


    //get all services
    app.get('/available', async(req,res) =>{
      const date = req.query.date ;

      //step:1  get all services
      const services = await serviceCollection.find().toArray();
      //step:2  get the booking of that day
      const query = {date: date};
      const bookings = await bookingCollection.find(query).toArray();

      //step:3 for each service find the booking for the service

      services.forEach(service => {
        const serviceBookings = bookings.filter(book => book.treatment === service.name);

        const booked = serviceBookings.map(book => book.slot)
        const available = service.slots.filter(slot => !booked.includes(slot));
        service.slots = available;
        
      })

      res.send(services);

    })

   }
   finally{

   }

}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('wellcome to my server')
})

app.listen(port, () => {
console.log(`Doctors app listening on port ${port}`)
})