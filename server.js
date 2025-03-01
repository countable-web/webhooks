const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(bodyParser.json());

app.post("/webhooks", (req, res) => {
  console.log("Received Notion Webhook:", JSON.stringify(req.body, null, 2));
  res.status(200).json({ message: "Webhook received" });
});

app.listen(PORT, () => {
  console.log(`✅ Notion Webhook listening on port ${PORT}`);
});

