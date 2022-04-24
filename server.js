import express from 'express'
import cors from "cors";
const morgan = require("morgan");
require("dotenv").config();
import mongoose from "mongoose";
import { readdirSync } from "fs";
import cookieParser from "cookie-parser";
import csrf from "csurf";

const app = express();
const csrfProtection = csrf({ cookie: true });

// database connection
mongoose
  .connect(process.env.DATABASE, { useUnifiedTopology: true })
  .then(() => console.log("DB Connected......."))
  .catch((err) => console.log("DB Connection Err=>", err));

// cors
app.use(cors());

app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));
app.use(cookieParser());

// add /api on top of the routes available in routes folder
readdirSync("./routes").map((r) => {
    app.use("/api", require(`./routes/${r}`));
});

// csrf token 
app.use(csrfProtection);

app.get("/api/csrf-token", (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});
  
const port = process.env.PORT || 5500;  
app.listen(port, () => console.log(`server is running on port ${port}`));