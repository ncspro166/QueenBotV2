const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports.config = {
    name: "artify",
    version: "1.0.0",
    author: "Priyanshi Kaur",
    countDown: 5,
    role: 0,
    shortDescription: "Apply an artistic style to an image",
    longDescription: "Transform an image by applying an artistic filter using the artify API",
    category: "image",
    guide: {
        en: "{pn} [Reply to an image]"
    }
};

module.exports.onStart = async function ({ api, event, message }) {
    const { messageReply, threadID, messageID } = event;

    if (!messageReply || !messageReply.attachments || !messageReply.attachments[0]) {
        return message.reply("Please reply to an image to apply the artify effect.");
    }

    const attachment = messageReply.attachments[0];
    if (attachment.type !== "photo") {
        return message.reply("The replied content must be an image.");
    }

    try {
        message.reply("");

        const response = await axios({
            method: 'get',
            url: `https://www.samirxpikachu.run.place/artify`,
            params: {
                url: attachment.url
            },
            responseType: 'arraybuffer'
        });

        // Create temporary file path
        const tempFilePath = path.join(__dirname, "temp", `artified_${Date.now()}.jpg`);
        
        // Ensure temp directory exists
        if (!fs.existsSync(path.join(__dirname, "temp"))) {
            fs.mkdirSync(path.join(__dirname, "temp"));
        }

        // Write the image to temporary file
        fs.writeFileSync(tempFilePath, Buffer.from(response.data));

        // Send the artified image
        await api.sendMessage(
            {
                attachment: fs.createReadStream(tempFilePath),
                body: "🎨 Here's your artified image!"
            },
            threadID,
            () => fs.unlinkSync(tempFilePath) // Clean up temp file after sending
        );

    } catch (error) {
        console.error("Error applying artify effect:", error);
        return message.reply("❌ An error occurred while applying the artify effect. Please try again later.");
    }
};