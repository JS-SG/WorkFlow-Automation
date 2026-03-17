require("dotenv").config();
const express = require("express");
const cors = require("cors");
require("./database/schema");

const app = express();

app.use(cors({
    origin: [
      "http://localhost:5173",
      process.env.FRONTEND_URL
    ].filter(Boolean),
    methods: ["GET","POST","PUT","DELETE","PATCH"],
    credentials: true
}));
app.use(express.json());
console.log("Loading routes...");
app.use("/workflows", require("./routes/workflows"));
app.use("/steps", require("./routes/steps"));
app.use("/rules", require("./routes/rules"));
app.use("/executions", require("./routes/executions"));
app.use("/auth", require("./routes/auth"));
const notifications = require("./routes/notifications");
console.log("Notifications route imported");
app.use("/notifications", notifications);

app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.listen(5000, () => {
  console.log("WorkFlow Agent Server running on port 5000");
});
