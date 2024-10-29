const fs = require('fs');
const path = require('path');

module.exports = {
    config: {
        name: "threadinfo",
        version: "1.0.0",
        author: "Priyanshi Kaur",
        countDown: 5,
        role: 0,
        shortDescription: "Get information about a thread (group or individual chat)",
        longDescription: "Retrieve details about a thread, such as the title, participants, and group picture (if applicable).",
        category: "info",
        guide: {
            en: "{pn}"
        }
    },

    onStart: async function ({ api, event, args, message }) {
        try {
            const threadID = event.threadID;

            // Get thread information
            const threadInfo = await api.getThreadInfo(threadID);

            // Get thread history (up to 20 messages)
            const threadHistory = await api.getThreadHistory(threadID, 20, null, null);

            // Get thread picture (if available)
            const threadPicture = await api.getThreadPicture(threadID);

            let messageText = `Thread Information:\n`;
            messageText += `- Title: ${threadInfo.threadName}\n`;
            messageText += `- Type: ${threadInfo.isGroup ? 'Group' : 'Individual'}\n`;
            messageText += `- Participants: ${threadInfo.participantIDs.length}\n`;
            messageText += `- Messages: ${threadHistory.length}\n`;

            if (threadPicture) {
                const imagePath = path.join('scripts', 'commands', 'cache', 'thread_picture.jpg');
                fs.writeFileSync(imagePath, threadPicture);
                messageText += `\nThread picture saved to: ${imagePath}`;
            } else {
                messageText += `\nNo thread picture available.`;
            }

            message.reply(messageText);
        } catch (error) {
            console.error('Error retrieving thread information:', error);
            message.reply('❌ Error: Failed to retrieve thread information.');
        }
    }
};