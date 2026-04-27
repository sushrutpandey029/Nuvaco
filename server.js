import express from "express"
import dotenv from "dotenv"

dotenv.config();

const app = express();
const port = process.env.port || 5050;

app.get("/",(req,res)=>{
    res.send("yes done");
})

app.listen(port,(req,res)=>{
    console.log(`http://localhost:${port}`)
})

