const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT|| 5000;

//middleware
app.use(cors());
app.use(express.json());

//mogodb connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zmhcerf.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//doctors_portal

//node mongodb api
async function run(){
   try{
    await client.connect();
    const servicesCollection=client.db("doctors_portal").collection("services");
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