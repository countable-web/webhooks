import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 4325;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
console.log("SLACK WEBHOOK URL", SLACK_WEBHOOK_URL);

app.use(bodyParser.json());

const allowedAuthors = new Set(["Aaron", "Trixia", "Dwight", "Hyoeun", "Samantha", "Jo"]);

app.post("/webhooks/bitbucket", async (req, res) => {
  console.log("Received Webhook!");

  const prData = req.body.pullrequest;
  const eventType = req.headers['x-event-key']

  if (prData) {
    const authorFullName = prData.author?.display_name;
    const authorFirstName = authorFullName?.split(" ")[0];
    console.log("Author First Name:", authorFirstName, "Allowed?", allowedAuthors.has(authorFirstName));

    const prTitle = prData.title;
    const prLink = prData.links?.html?.href;
    const sourceBranch = prData.source?.branch?.name;
    const destinationBranch = prData.destination?.branch?.name;

    // Only notify if PR is targeting 'develop'
    if (destinationBranch !== "develop") {
      console.log("Skipping: PR is not targeting 'develop'.");
      return res.status(200).json({ message: "Webhook received, but PR is not for 'develop'" });
    }

    // Exclude PRs from 'master' to 'develop'
    if (sourceBranch === "master" && destinationBranch === "develop") {
      console.log("Skipping: PR from 'master' to 'develop'.");
      return res.status(200).json({ message: "Webhook received, but PR is from 'master' to 'develop'" });
    }

    // Determine if it's a new PR or an update
    const isNewPR = eventType?.includes("pullrequest:created");
    const isUpdatedPR = eventType?.includes("pullrequest:updated");

    let messageType = "";
    if (isNewPR) {
      messageType = ":wave: Hey team, a new pull request is ready for review! :eyes:";
    } else if (isUpdatedPR) {
      messageType = ":repeat: A pull request has been updated! :eyes:";
    } else {
      console.log("Skipping: PR is neither new nor updated.");
      return res.status(200).json({ message: "Webhook received, but not a new PR or update" });
    }

    if (authorFirstName && allowedAuthors.has(authorFirstName)) {
      const slackMessage = {
        text: messageType,
        attachments: [
          {
            color: isNewPR ? "#36a64f" : "#f4b400", // Green for new, yellow for updates
            title: prTitle,
            title_link: prLink,
            fields: [
              {
                title: "Created By",
                value: authorFullName,
                short: true,
              },
              {
                title: "Branch",
                value: `${sourceBranch} → ${destinationBranch}`,
                short: true,
              },
            ],
            footer: isNewPR ? "Don't forget to review! :mag: :memo:" : "Review the latest changes! :repeat:",
          },
        ],
      };

      try {
        await axios.post(SLACK_WEBHOOK_URL, slackMessage);
        console.log(`✅ Slack notification sent for ${isNewPR ? "new PR" : "updated PR"}!`);
      } catch (error) {
        console.error("❌ Failed to send Slack message:", error);
      }
    }
  }

  res.status(200).json({ message: "Webhook received" });
});


app.post("/webhooks/notion-zapier", async (req, res) => {
  console.log("Received Zapier Notion Webhook!")
  const { title, assignee, url } = req.body;

  if (!title || !url) {
    console.log("Skipping: Missing required fields.");
    return res.status(400).json({ message: "Invalid payload" });
  }

  const slackMessage = {
    text: `:bulb: New Ticket In QA [${title}]`,
    attachments: [
      {
        color: "#36a64f",
        title: title,
        title_link: url,
        fields: [
          {
            title: "Assigned To",
            value: assignee || "Unassigned",
            short: true,
          },
          {
            title: "Reminder",
            value: "Set release build & provide accurate QA instructions",
            short: false,
          },
        ],
      },
    ],
  };

  try {
    await axios.post(SLACK_WEBHOOK_URL, slackMessage);
    console.log(`✅ Slack notification sent for new ticket!`);
  } catch (error) {
    console.error("❌ Failed to send Slack message:", error);
  }

  res.status(200).json({ message: "Webhook received" });
});


app.listen(PORT, () => {
  console.log(`✅ Notion Webhook listening on port ${PORT}`);
});
