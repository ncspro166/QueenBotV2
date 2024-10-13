const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const IMGUR_CLIENT_ID = "5ba5e80cd3433a7";
const UPSCALE_API_KEY = "r-e377e74a78b7363636jsj8ffb61ce"; // Replace with your actual API key

module.exports = {
  config: {
    name: "4k",
    version: "2.0.0",
    author: "Priyanshi Kaur || AJ King",
    countDown: 5,
    role: 0,
    shortDescription: "Upscale image and upload to Imgur",
    longDescription: "Upscales an image using an API and uploads the result to Imgur",
    category: "image",
    guide: {
      en: "{pn} Reply to an image to upscale and upload it"
    }
  },

  onStart: async function ({ message, api, event }) {
    const imageUrl = event.messageReply?.attachments[0]?.url;

    if (!imageUrl) {
      return message.reply('⚠️ Please reply to an image to upscale and upload it.');
    }

    api.setMessageReaction("⏳", event.messageID, (err) => {}, true);

    try {
      // Step 1: Upscale the image
      const upscaledImageUrl = await upscaleImage(imageUrl);

      // Step 2: Download the upscaled image
      const imageResponse = await axios.get(upscaledImageUrl, { responseType: 'arraybuffer' });
      const tempImagePath = path.join(__dirname, 'temp_upscaled_image.jpg');
      fs.writeFileSync(tempImagePath, imageResponse.data);

      // Step 3: Upload to Imgur
      const imgurLink = await uploadToImgur(tempImagePath);

      // Step 4: Send the result
      await api.sendMessage(
        {
          body: '✅ Image upscaled and uploaded successfully:\n' + imgurLink,
          attachment: fs.createReadStream(tempImagePath)
        },
        event.threadID
      );

      // Clean up
      fs.unlinkSync(tempImagePath);
      api.setMessageReaction("✅", event.messageID, (err) => {}, true);

    } catch (error) {
      console.error('Upscale and upload failed:', error);
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

async function uploadToImgur(imagePath) {
  const formData = new FormData();
  formData.append('image', fs.createReadStream(imagePath));

  try {
    const response = await axios.post('https://api.imgur.com/3/upload', formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Client-ID ${IMGUR_CLIENT_ID}`
      }
    });

    return response.data.data.link;
  } catch (error) {
    console.error('Imgur upload failed:', error);
    throw new Error('Failed to upload image to Imgur');
  }
}