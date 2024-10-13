const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

let currentStyle = "none"; // Default style

const validStyles = [
  "none", "anime", "manga", "3dmodel", "digitalart", "fantasyart", 
  "photo", "oilpainting", "lineart", "cinematic", "analogfilm", 
  "comicbook", "isometric", "cute", "pixelart"
];

module.exports = {
  config: {
    name: "niji",
    version: "1.0.0",
    author: "Priyanshi Kaur | Claude 3.5",
    countDown: 10,
    role: 0,
    shortDescription: "🎨 Generate images using Niji API",
    longDescription: "🖼️ Generate images based on prompts and styles using the Niji API",
    category: "image",
    guide: {
      en: "{prefix}niji <prompt>\n" +
          "{prefix}niji -<style_name> (to set a new default style)\n\n" +
          "Supported styles:\n" +
          "🌟 none (Default)\n" +
          "🎌 anime\n" +
          "📚 manga\n" +
          "🤖 3dmodel\n" +
          "🖋️ digitalart\n" +
          "🎨 fantasyart\n" +
          "📸 photo\n" +
          "🖼️ oilpainting\n" +
          "✏️ lineart\n" +
          "🌅 cinematic\n" +
          "🧪 analogfilm\n" +
          "🎭 comicbook\n" +
          "🏙️ isometric\n" +
          "🐱 cute\n" +
          "🧸 pixelart\n"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID } = event;
    
    // Check if the user is setting a new style
    if (args[0] && args[0].startsWith('-')) {
      const newStyle = args[0].substring(1).toLowerCase();
      if (validStyles.includes(newStyle)) {
        currentStyle = newStyle;
        return message.reply(`✅ Style successfully updated to: ${currentStyle}`);
      } else {
        const errorMessage = `❌ Error: Invalid style "${newStyle}"\n\n` +
                             `🎨 Available styles:\n${validStyles.join(', ')}\n\n` +
                             `Please choose a valid style from the list above.`;
        return message.reply(errorMessage);
      }
    }

    const prompt = args.join(" ").trim();

    if (!prompt) {
      return message.reply("❌ Error: Please provide a prompt for the image generation.");
    }

    // Construct API URL
    const apiUrl = `https://for-devs.onrender.com/api/niji`;
    const params = {
      prompt: prompt,
      style: currentStyle,
      sampler: "DPM++ 2M Karras",
      quality: "Standard v3.1",
      width: 1536,
      height: 640,
      ratio: "1024 x 1024",
      apikey: "r-e377e74a78b7363636jsj8ffb61ce"
    };

    try {
      message.reply(`🎨 Generating your image with style: ${currentStyle}... Please wait!`);

      const response = await axios.get(apiUrl, { 
        params: params,
        responseType: 'arraybuffer'
      });

      const imagePath = path.join(__dirname, `niji_${Date.now()}.jpg`);
      await fs.writeFile(imagePath, response.data);

      await message.reply({
        body: `✨ Here's your generated image:\n🖼️ Prompt: ${prompt}\n🎨 Style: ${currentStyle}`,
        attachment: fs.createReadStream(imagePath)
      });

      // Clean up: delete the image file after sending
      await fs.unlink(imagePath);

    } catch (error) {
      console.error('Error:', error);
      let errorMessage = "❌ An error occurred while generating the image.";
      if (error.response) {
        errorMessage += ` Status code: ${error.response.status}`;
        if (error.response.data && error.response.data.error) {
          errorMessage += `\nError details: ${error.response.data.error}`;
        }
      } else if (error.request) {
        errorMessage += " The request was made but no response was received.";
      } else {
        errorMessage += ` Error details: ${error.message}`;
      }
      message.reply(errorMessage);
    }
  }
};