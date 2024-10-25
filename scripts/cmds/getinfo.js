const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = {
    config: {
        name: "getinfo",
        aliases: ["spy", "userinfo", "whois"],
        version: "2.0",
        author: "Priyanshi Kaur",
        countDown: 5,
        role: 0,
        shortDescription: "Get detailed user information",
        longDescription: "Get comprehensive information about a user including profile details, mutual friends, account status, and more",
        category: "utility",
        guide: {
            en: `{pn} [@mention/reply/uid] [-flags]
Available flags:
-p : Include profile picture
-m : Show mutual friends count
-s : Show account statistics
-a : Show all information`,
            examples: [
                "{pn} @user -p",
                "{pn} reply -a",
                "{pn} 100091893415755 -s"
            ]
        }
    },

    onStart: async function ({ api, args, message, event, threadsData, usersData }) {
        const { threadID } = event;
        const { mentions, messageReply } = event;
        let targetUsers = [];
        let flags = new Set(args.filter(arg => arg.startsWith('-')));

        try {
            // Handle different ways to specify target user(s)
            if (Object.keys(mentions).length > 0) {
                targetUsers = Object.keys(mentions);
                // Remove mention texts from args
                args = args.filter(arg => !Object.values(mentions).some(mention => arg.includes(mention)));
            } else if (messageReply) {
                targetUsers = [messageReply.senderID];
            } else if (args[0] && /^\d+$/.test(args[0])) {
                targetUsers = [args[0]];
            } else {
                targetUsers = [event.senderID];
            }

            let mentionsArray = [];
            let responseMsg = "";
            
            for (const userID of targetUsers) {
                try {
                    // Get basic user info
                    const userInfo = await api.getUserInfo(userID);
                    const user = userInfo[userID];

                    // Get thread data for user participation info
                    const threadData = await threadsData.get(threadID);
                    const memberData = threadData.members.find(m => m.userID === userID);
                    
                    // Get user's custom data if available
                    const userData = await usersData.get(userID);

                    // Add to mentions array
                    mentionsArray.push({
                        id: userID,
                        tag: user.name
                    });

                    // Calculate various metrics
                    const joinDate = memberData ? new Date(memberData.joinedAt) : null;
                    const accountAge = calculateAccountAge(user.createdTime);
                    const lastActive = memberData ? getLastActive(memberData.lastActive) : "Unknown";
                    const messageCount = memberData ? memberData.messageCount || 0 : 0;
                    
                    // Format gender
                    const gender = user.gender === 1 ? "Female" : 
                                 user.gender === 2 ? "Male" : 
                                 "Not specified";

                    // Start building response
                    responseMsg += `🔍 DETAILED USER INFORMATION\n`;
                    responseMsg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
                    
                    // Basic Information
                    responseMsg += `👤 Basic Information\n`;
                    responseMsg += `• Name: @${user.name}\n`;
                    responseMsg += `• UserID: ${userID}\n`;
                    responseMsg += `• First Name: ${user.firstName}\n`;
                    responseMsg += `• Gender: ${gender}\n`;
                    responseMsg += `• Profile: facebook.com/${userID}\n`;
                    
                    // Account Status
                    responseMsg += `\n📊 Account Status\n`;
                    responseMsg += `• Friend Status: ${user.isFriend ? "Friends" : "Not Friends"}\n`;
                    responseMsg += `• Account Type: ${user.verified ? "Verified ✓" : "Standard"}\n`;
                    responseMsg += `• Account Age: ${accountAge}\n`;
                    
                    // Group Activity (if in a group)
                    if (memberData) {
                        responseMsg += `\n👥 Group Activity\n`;
                        responseMsg += `• Joined Group: ${joinDate ? joinDate.toLocaleString() : "Unknown"}\n`;
                        responseMsg += `• Last Active: ${lastActive}\n`;
                        responseMsg += `• Messages Sent: ${messageCount.toLocaleString()}\n`;
                        responseMsg += `• Nickname: ${memberData.nickname || "Not set"}\n`;
                    }

                    // Additional Stats (if -s flag)
                    if (flags.has('-s') || flags.has('-a')) {
                        responseMsg += `\n📈 Statistics\n`;
                        responseMsg += `• Average Messages/Day: ${calculateAvgMessages(messageCount, joinDate)}\n`;
                        responseMsg += `• Activity Score: ${calculateActivityScore(messageCount, lastActive)}/10\n`;
                        if (userData) {
                            responseMsg += `• Total Commands Used: ${userData.commandsUsed || 0}\n`;
                        }
                    }

                    // Mutual Information (if -m flag)
                    if (flags.has('-m') || flags.has('-a')) {
                        const mutualFriends = await api.getMutualFriends(userID);
                        responseMsg += `\n🤝 Mutual Information\n`;
                        responseMsg += `• Mutual Friends: ${mutualFriends.length}\n`;
                        if (mutualFriends.length > 0) {
                            responseMsg += `• Top Mutual Friends: ${mutualFriends.slice(0, 3).map(f => f.name).join(", ")}\n`;
                        }
                    }

                    responseMsg += `\n━━━━━━━━━━━━━━━━━━━━━\n\n`;

                    // Handle profile picture flag
                    if (flags.has('-p') || flags.has('-a')) {
                        try {
                            const profilePicUrl = await getProfilePicture(userID);
                            if (profilePicUrl) {
                                const attachment = await downloadImage(profilePicUrl);
                                return message.reply({
                                    body: responseMsg.trim(),
                                    mentions: mentionsArray,
                                    attachment: attachment
                                });
                            }
                        } catch (err) {
                            console.error("Error getting profile picture:", err);
                        }
                    }

                } catch (userError) {
                    responseMsg += `❌ Error getting info for UserID ${userID}: ${userError.message}\n\n`;
                }
            }

            // Send response without attachment if no profile picture
            return message.reply({
                body: responseMsg.trim(),
                mentions: mentionsArray
            });

        } catch (error) {
            console.error("Error in getUserInfo command:", error);
            return message.reply("❌ An error occurred while fetching user information. Please try again later.");
        }
    }
};

// Utility Functions
function calculateAccountAge(createdTime) {
    if (!createdTime) return "Unknown";
    const created = new Date(createdTime);
    const now = new Date();
    const ageInDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    if (ageInDays < 30) return `${ageInDays} days`;
    if (ageInDays < 365) return `${Math.floor(ageInDays / 30)} months`;
    return `${Math.floor(ageInDays / 365)} years`;
}

function getLastActive(lastActiveTime) {
    if (!lastActiveTime) return "Never";
    const now = new Date();
    const lastActive = new Date(lastActiveTime);
    const diffMinutes = Math.floor((now - lastActive) / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return `${Math.floor(diffMinutes / 1440)} days ago`;
}

function calculateAvgMessages(messageCount, joinDate) {
    if (!joinDate || !messageCount) return "0";
    const daysInGroup = Math.max(1, Math.floor((new Date() - joinDate) / (1000 * 60 * 60 * 24)));
    return (messageCount / daysInGroup).toFixed(1);
}

function calculateActivityScore(messageCount, lastActive) {
    if (!lastActive || !messageCount) return 0;
    const lastActiveDate = new Date(lastActive);
    const daysSinceActive = Math.floor((new Date() - lastActiveDate) / (1000 * 60 * 60 * 24));
    const baseScore = Math.min(10, messageCount / 100);
    const activityPenalty = Math.min(5, daysSinceActive / 7);
    return Math.max(0, Math.min(10, baseScore - activityPenalty)).toFixed(1);
}

async function getProfilePicture(userID) {
    try {
        const response = await axios.get(`https://graph.facebook.com/${userID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
        return response.request.res.responseUrl;
    } catch (error) {
        console.error("Error getting profile picture URL:", error);
        return null;
    }
}

async function downloadImage(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const tempPath = path.join(__dirname, `temp_${Date.now()}.png`);
        fs.writeFileSync(tempPath, response.data);
        const attachment = fs.createReadStream(tempPath);
        attachment.on('end', () => fs.unlinkSync(tempPath));
        return attachment;
    } catch (error) {
        console.error("Error downloading image:", error);
        return null;
    }
}