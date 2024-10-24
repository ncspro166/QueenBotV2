module.exports.config = {
    name: "rbg",
    version: "1.0",
    author: "Assistant",
    countDown: 5,
    role: 0,
    shortDescription: "Remove image background",
    longDescription: "Remove the background from an image",
    category: "image",
    guide: {
        en: "{pn} [Reply to an image]"
    }
};

module.exports.onStart = async function ({ api, event, message }) {
    const { messageReply, threadID, messageID } = event;

    if (!messageReply || !messageReply.attachments || !messageReply.attachments[0]) {
        return message.reply("Please reply to an image to remove its background.");
    }

    const attachment = messageReply.attachments[0];
    if (attachment.type !== "photo") {
        return message.reply("The replied content must be an image.");
    }

    try {
        const apiKey = "r-e377e74a78b7363636jsj8ffb61ce"; // Replace with your API key
        message.reply("⌛ Removing background from your image...");

        const response = await axios({
            method: 'get',
            url: `https://for-devs.onrender.com/api/rbg`,
            params: {
                imageUrl: attachment.url,
                apikey: apiKey
            },
            responseType: 'arraybuffer'
        });

        // Create temporary file path
        const tempFilePath = path.join(__dirname, "temp", `nobg_${Date.now()}.png`);
        
        // Ensure temp directory exists
        if (!fs.existsSync(path.join(__dirname, "temp"))) {
            fs.mkdirSync(path.join(__dirname, "temp"));
        }

        // Write the image to temporary file
        fs.writeFileSync(tempFilePath, Buffer.from(response.data));

        // Send the processed image
        await api.sendMessage(
            {
                attachment: fs.createReadStream(tempFilePath),
                body: "✨ Here's your image with background removed!"
            },
            threadID,
            () => fs.unlinkSync(tempFilePath) // Clean up temp file after sending
        );

    } catch (error) {
        console.error(error);
        return message.reply("❌ An error occurred while processing your image. Please try again later.");
    }
};