import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 4325;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
console.log("SLACK WEBHOOK URL", SLACK_WEBHOOK_URL);

app.use(bodyParser.json());

const allowedAuthors = new Set(["Aaron", "Trixia", "Dwight", "Hyoeun", "Samantha", "Jo"]);

const mapping = [
  {
    name: 'Aaron',
    slackMemberId: 'U01LAMCBGG1'
  },
  {
    name: 'Trixia',
    slackMemberId: 'U07JZ8YV4G1'
  },

  {
    name: 'Dwight',
    slackMemberId: 'U03HSQ9DLJ3'
  },

  {
    name: 'Hyoeun',
    slackMemberId: 'U07K96AFGVD'
  },

  {
    name: 'Samantha',
    slackMemberId: 'U08FT76GVQA'
  },

  {
    name: 'Jo',
    slackMemberId: 'U04HA3NFPN0'
  },
]


app.post("/webhooks/bitbucket", async (req, res) => {
  console.log("Received Webhook!");

  const prData = req.body.pullrequest;
  const eventType = req.headers['x-event-key']

  if (prData) {
    const authorFullName = prData.author?.display_name;
    const authorFirstName = authorFullName?.split(" ")[0];
    console.log("Author First Name:", authorFirstName, "Allowed?", allowedAuthors.has(authorFirstName));
    const prDescription = prData.description.raw || "";
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
      messageType = ":wave: Hey team, a new pull request is ready for review!";
    } else if (isUpdatedPR) {
      messageType = ":repeat: A pull request has been updated!";
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
      // Check if PR description contains "[Enter Here]"
      if (prDescription.includes("[Enter Here]") || prDescription.includes(`Enter Here`)) {

        const slack = mapping.find(m => authorFullName?.includes(m.name))
        const id = slack.slackMemberId

        slackMessage.attachments.push({
          color: "#ff0000",
          title: "🚨 Missing Information in PR Description!",
          text: `Hey <@${id || authorFirstName}>, it looks like your PR description still contains placeholders ("[Enter Here]").\n\nPlease complete the DoD checklist before submitting!`,
        });
      }

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
  const { title, assignee, url } = req.body;

  if (!title || !url) {
    console.log("Skipping: Missing required fields.");
    return res.status(400).json({ message: "Invalid payload" });
  }

  const slack = mapping.find(m => assignee?.includes(m.name))
  const id = slack.slackMemberId
  const mention = id ? `<@${id}>` : assignee

  const slackMessage = {
    text: `:bulb: Missing Fields on ticket moved to QA`,
    attachments: [
      {
        color: "#FFA500",
        title: title,
        title_link: url,
        fields: [
          {
            title: "Assigned To",
            value: mention || "Unassigned",
            short: true,
          },
          {
            title: "Action",
            value: "Provide accurate instructions for QA & Set Release Version numbe:wqa!",
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
