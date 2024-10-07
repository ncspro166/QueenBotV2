const axios = require('axios');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

module.exports = {
  config: {
    name: "info",
    version: "2.0.0",
    author: "Priyanshi Kaur",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Display bot owner information"
    },
    longDescription: {
      en: "Display detailed information about the bot owner, including a random fun fact"
    },
    category: "info",
    guide: {
      en: "{prefix}ownerinfo"
    }
  },

  onStart: async function ({ api, event }) {
    try {
      // React with hourglass emoji during execution
      api.setMessageReaction("⏳", event.messageID, (err) => {
        if (err) console.error(`Error setting reaction: ${err.message}`);
      }, true);

      // Owner info
      const ownerInfo = {
        botName: "QueenBotV2",
        ownerName: "Priyanshi Kaur",
        age: "24",
        location: "India",
        facebook: "https://www.facebook.com/PriyanshiKaurJi",
        telegram: "@priyanshikaurji",
        discord: "https://discord.gg/wBYsueQU"
      };

      // Get current time in Asia/Kolkata timezone
      const currentTime = moment().tz("Asia/Kolkata").format("MMMM Do YYYY, h:mm:ss A");

      // Fetch a random fun fact
      const factResponse = await axios.get('https://api.api-ninjas.com/v1/facts?limit=1', {
        headers: { 'X-Api-Key': 'mz2frvHwqBCS3dTjkjM2wA==RaABY2HqVA2A58w0' }
      });
      if (!factResponse || !factResponse.data || factResponse.data.length === 0) {
        throw new Error('Fun fact not found.');
      }
      const funFact = factResponse.data[0].fact;

      // Download the image
      const imageUrl = 'https://i.imgur.com/JRPaKw7.png';
      const imagePath = path.join(__dirname, 'owner_image.png');
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(imagePath, Buffer.from(imageResponse.data));

      // Prepare the message to send
      const message = `
🤖 Bot Name: ${ownerInfo.botName}
👤 Owner Name: ${ownerInfo.ownerName}
🎂 Age: ${ownerInfo.age}
📍 Location: ${ownerInfo.location}
📱 Social Media:
   📘 Facebook: ${ownerInfo.facebook}
   📞 Telegram: ${ownerInfo.telegram}
   🎮 Discord: ${ownerInfo.discord}

🕰️ Current Time (Asia/Kolkata): ${currentTime}

🎨 Fun Fact: ${funFact}

Thanks for using our bot! 😊
      `.trim();

      // Send the message with the image attachment
      api.sendMessage(
        { body: message, attachment: fs.createReadStream(imagePath) },
        event.threadID,
        (err) => {
          if (err) {
            console.error(`Error sending message: ${err.message}`);
            api.setMessageReaction("❌", event.messageID, (err) => {
              if (err) console.error(`Error setting error reaction: ${err.message}`);
            }, true);
          } else {
            api.setMessageReaction("✅", event.messageID, (err) => {
              if (err) console.error(`Error setting success reaction: ${err.message}`);
            }, true);
          }
          // Delete the image after sending the message
          fs.unlinkSync(imagePath);
        }
      );

    } catch (error) {
      console.error('An error occurred:', error.message);

      // Detailed error logging
      if (error.response) {
        console.error(`Status Code: ${error.response.status}`);
        console.error(`Response Data: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error Message:', error.message);
      }

      // Send error message to the chat
      api.setMessageReaction("❌", event.messageID, (err) => {
        if (err) console.error(`Error setting error reaction: ${err.message}`);
      }, true);

      api.sendMessage(
        `An error occurred while fetching owner information: ${error.message}\nPlease try again later.`,
        event.threadID
      );
    }
  }
};