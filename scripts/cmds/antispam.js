const { getTime } = global.utils;
const spamThreshold = 10;
const timeWindow = 60 * 1000; // 1 minute in milliseconds
let spamTracker = {};

module.exports = {
    config: {
        name: "antispam",
        version: "1.0",
        author: "Priyanshi Kaur",
        countDown: 5,
        role: 0,
        description: {
            en: "Automatically bans users who spam the same message more than 10 times within 1 minute."
        },
        category: "moderation",
        guide: {
            en: "This command automatically bans spammers. No need to manually invoke it. Admins can use .unban <uid> to unban."
        }
    },

    langs: {
        en: {
            spamDetected: "🚨 User [%1 | %2] has been banned for spamming the same message %3 times within 1 minute.\n» Reason: Spamming",
            alreadyBanned: "User [%1 | %2] is already banned.",
            unbanSuccess: "User [%1 | %2] has been unbanned."
        }
    },

    onStart: async function ({ api, event, usersData, message, getLang }) {
        const { senderID, body } = event;

        // Initialize user tracking if not already done
        if (!spamTracker[senderID]) {
            spamTracker[senderID] = [];
        }

        const now = Date.now();
        spamTracker[senderID].push({ message: body, timestamp: now });

        // Clean up old messages outside of the 1-minute time window
        spamTracker[senderID] = spamTracker[senderID].filter(entry => now - entry.timestamp <= timeWindow);

        // Check for spam (same message sent repeatedly)
        const spamMessages = spamTracker[senderID].filter(entry => entry.message === body);

        if (spamMessages.length >= spamThreshold) {
            // User is spamming, proceed with auto-ban
            const userData = await usersData.get(senderID);
            const { banned = {} } = userData;

            if (banned.status) {
                return message.reply(getLang("alreadyBanned", senderID, userData.name));
            }

            const time = getTime("DD/MM/YYYY HH:mm:ss");
            await usersData.set(senderID, {
                banned: {
                    status: true,
                    reason: "Spamming",
                    date: time
                }
            });

            message.reply(getLang("spamDetected", senderID, userData.name, spamMessages.length));
        }
    },

    // Command for admins to unban users
    onCommand: async function ({ args, usersData, message, event, getLang }) {
        const isAdmin = event.senderID == "61556609578687"; // Replace 'admin-id' with the actual admin ID check
        if (!isAdmin) {
            return message.reply("❌ Only admins can unban users.");
        }

        const uid = args[1];
        if (!uid) return message.reply("❌ Please provide a UID to unban.");

        const userData = await usersData.get(uid);
        if (!userData || !userData.banned || !userData.banned.status) {
            return message.reply("❌ User is not banned.");
        }

        await usersData.set(uid, { banned: {} });
        message.reply(getLang("unbanSuccess", uid, userData.name));
    }
};