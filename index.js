import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./database/db.js";
import userRoute from "./routes/user.route.js";
import courseRoute from "./routes/course.route.js";
import mediaRoute from "./routes/media.route.js";
import purchaseRoute from "./routes/purchaseCourse.route.js";
import courseProgressRoute from "./routes/courseProgress.route.js";


dotenv.config({});
//call database connection here
connectDB();

const app = express();
const port = process.env.PORT || 8080;


//default midlware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "https://skill-verse-front-end-f5pu.vercel.app",
    credentials: true,
  })
);

//apis
app.use("/api/v1/media", mediaRoute);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/course", courseRoute);
app.use("/api/v1/purchase", purchaseRoute);
app.use("/api/v1/progress", courseProgressRoute);


app.listen(port, () => {
  console.log(`Server listen at port ${port}`);
});
