const axios = require('axios');
const fs = require('fs');
const path = require('path');

const UPSCALE_API_KEY = "r-e377e74a78b7363636jsj8ffb61ce"; // Replace with your actual API key

module.exports = {
  config: {
    name: "4k",
    version: "2.1.0",
    author: "Priyanshi Kaur || AJ King",
    countDown: 5,
    role: 0,
    shortDescription: "Upscale image",
    longDescription: "Upscales an image using an API",
    category: "image",
    guide: {
      en: "{pn} Reply to an image to upscale it"
    }
  },

  onStart: async function ({ message, api, event }) {
    const imageUrl = event.messageReply?.attachments[0]?.url;

    if (!imageUrl) {
      return message.reply('⚠️ Please reply to an image to upscale it.');
    }

    api.setMessageReaction("⏳", event.messageID, (err) => {}, true);

    try {
      // Step 1: Upscale the image
      const upscaledImageUrl = await upscaleImage(imageUrl);

      // Step 2: Download the upscaled image
      const imageResponse = await axios.get(upscaledImageUrl, { responseType: 'arraybuffer' });
      const tempImagePath = path.join(__dirname, 'temp_upscaled_image.jpg');
      fs.writeFileSync(tempImagePath, imageResponse.data);

      // Step 3: Send the result
      await api.sendMessage(
        {
          body: '✅ Image upscaled successfully!',
          attachment: fs.createReadStream(tempImagePath)
        },
        event.threadID
      );

      // Clean up
      fs.unlinkSync(tempImagePath);
      api.setMessageReaction("✅", event.messageID, (err) => {}, true);

    } catch (error) {
      console.error('Upscale failed:', error);
      await message.reply('❌ An error occurred while processing the image.');
      api.setMessageReaction("❌", event.messageID, (err) => {}, true);
    }
  }
};

async function upscaleImage(imageUrl) {
  const encodedUrl = encodeURIComponent(imageUrl);
  const upscaleUrl = `https://for-devs.onrender.com/api/upscale?imageurl=${encodedUrl}&apikey=${UPSCALE_API_KEY}`;

  try {
    const response = await axios.get(upscaleUrl, { responseType: 'json' });
    return response.data.imageUrl; // Assuming the API returns the upscaled image URL in this format
  } catch (error) {
    console.error('Upscaling failed:', error);
    throw new Error('Failed to upscale the image');
  }
}