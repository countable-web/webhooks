const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 4325;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL; // Add your Slack Webhook URL
console.log("SLACK WEBHOOK URL", SLACK_WEBHOOK_URL)

app.use(bodyParser.json());

app.post("/webhooks", async (req, res) => {
  console.log("Received Notion Webhook:", JSON.stringify(req.body, null, 2));

  const prData = req.body.pullrequest;
  if (prData) {
    const author = prData.author?.display_name;
    const prTitle = prData.title;
    const prLink = prData.links?.html?.href;
    const branch = `${prData.source?.branch?.name} → ${prData.destination?.branch?.name}`;

    if (author === "Aaron Ahn") {
      const slackMessage = {
        text: ":wave: Hey team, a new pull request is ready for review! :eyes:",
        attachments: [
          {
            color: "#36a64f",
            title: prTitle,
            title_link: prLink,
            fields: [
              {
                title: "Created By",
                value: author,
                short: true,
              },
              {
                title: "Branch",
                value: branch,
                short: true,
              },
            ],
            footer: "Don't forget to review! :mag: :memo:",
          },
        ],
      };

      try {
        await axios.post(SLACK_WEBHOOK_URL, slackMessage);
        console.log("✅ Slack notification sent!");
      } catch (error) {
        console.error("❌ Failed to send Slack message:", error);
      }
    }
  }

  res.status(200).json({ message: "Webhook received" });
});

app.listen(PORT, () => {
  console.log(`✅ Notion Webhook listening on port ${PORT}`);
});

