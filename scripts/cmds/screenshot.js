const axios = require("axios");
const fs = require("fs-extra");

module.exports = {
  config: {
    name: "screenshot",
    aliases: ["ss", "snap"],
    author: "Priyanshi Kaur",
    countDown: 0,
    role: 0,
    category: "utility",
    longDescription: {
      en: "Take a screenshot of any website using the provided link.",
    },
    guide: {
      en: "Use .screenshot [url]\nExample: .screenshot https://example.com",
    },
  },

  onStart: async function ({ api, event, args }) {
    const url = args[0];

    // Check if a URL is provided
    if (!url) {
      return api.sendMessage(
        "Please provide a URL to take a screenshot! 😺\nUsage: .screenshot [url]",
        event.threadID
      );
    }

    // Validating the URL structure
    const isValidUrl = (string) => {
      try {
        new URL(string);
        return true;
      } catch (error) {
        return false;
      }
    };

    if (!isValidUrl(url)) {
      return api.sendMessage("Invalid URL format. Please try again. 😿", event.threadID);
    }

    // Send waiting message
    const waitingMsg = await api.sendMessage(
      { body: `📸 Taking a screenshot of ${url}... Please wait a moment.` },
      event.threadID
    );

    try {
      // API call to take the screenshot
      const response = await axios({
        method: "GET",
        url: `https://priyansh-ai.onrender.com/ss?url=${encodeURIComponent(url)}`,
        responseType: "arraybuffer", // This is needed to download the image as binary
      });

      // Save the image temporarily
      const tempPath = __dirname + "/screenshot.png";
      fs.writeFileSync(tempPath, response.data);

      // Send the screenshot to the chat
      api.sendMessage(
        {
          body: `🌐 Screenshot of ${url}`,
          attachment: fs.createReadStream(tempPath),
        },
        event.threadID,
        () => {
          // Delete the temp file after sending
          fs.unlinkSync(tempPath);
        }
      );

      // Edit the initial waiting message
      api.editMessage({ body: "🎉 Screenshot ready!" }, waitingMsg.messageID);
    } catch (error) {
      console.error("Error taking screenshot:", error);
      api.editMessage(
        { body: "Oops! Something went wrong while taking the screenshot. 😿" },
        waitingMsg.messageID
      );
    }
  },
};