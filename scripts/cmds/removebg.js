const imglyRemoveBackground = require("@imgly/background-removal");
const fs = require("fs-extra");
const path = require("path");
const axios = require('axios');

module.exports = {
  config: {
    name: "rembg",
    version: "1.0.0",
    author: "Priyanshi Kaur || Claude 3.5",
    role: 0,
    shortDescription: "Removes the background from an image.",
    category: "image",
    guide: {
      en: "{pn} [reply to image]"
    }
  },

  onStart: async function ({ message, event, api }) {
     const publicPath = path.join(__dirname, '..', '..', 'public'); // Adjust if needed

    // Copy WASM and ONNX files to public path if they don't exist
    const wasmSource = path.join(__dirname, '..', '..', 'node_modules', '@imgly', 'background-removal', 'dist', '*.wasm');
    const onnxSource = path.join(__dirname, '..', '..', 'node_modules', '@imgly', 'background-removal', 'dist', '*.onnx');

    try {
       // Using copySync with overwrite: false to avoid unnecessary copying
       if (!fs.existsSync(${publicPath}/optimized_model_small.onnx)) {
           fs.copySync(onnxSource, publicPath, { overwrite: false, errorOnExist: false });
       }

       if (!fs.existsSync(${publicPath}/optimized_model_small.wasm)) {
           fs.copySync(wasmSource, publicPath, { overwrite: false, errorOnExist: false });
       }
    }
     catch (error) {
       console.error("Error copying WASM/ONNX files:", error);
       return message.reply("An error occurred setting up the background removal tool.");
    }

    const config = {
      publicPath: publicPath + "/", // Correct path
      debug: false,
      proxyToWorker: true,
      model: 'medium'
    };

    const imageUrl = event.messageReply?.attachments[0]?.url;

    if (!imageUrl) {
      return message.reply("Please reply to an image.");
    }


      try {
           message.react("⏳");

           const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
           const imageBuffer = Buffer.from(imageResponse.data, 'binary');

           imglyRemoveBackground(imageBuffer, config)
           .then(async (blob) => {
               const tempFilePath = path.join(__dirname, temp_${Date.now()}.png);
               await fs.writeFile(tempFilePath, Buffer.from(await blob.arrayBuffer()));

               message.reply({
                   body: "Here's your image with the background removed!",
                   attachment: fs.createReadStream(tempFilePath)
               }, () => fs.unlinkSync(tempFilePath));

               message.react("✅");
           })
           .catch((error) => {
                console.error("Error removing background:", error);
                message.reply("An error occurred while removing the background.");
                message.react("❌");
           });
      }
      catch (error) {
          console.error("Error fetching/processing image:", error);
          message.reply("An error occurred while fetching/processing the image.");
          message.react("❌");
      }
  }
};
