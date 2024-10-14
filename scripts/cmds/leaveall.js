module.exports = {
  config: {
    name: "leaveall",
    aliases: ["la"],
    version: "3.0.0",
    author: "Priyanshi Kaur",
    countDown: 5,
    role: 2,
    shortDescription: "Bot will leave selected group chats",
    longDescription: "List all groups and allow selective removal of the bot from chosen groups",
    category: "admin",
    guide: {
      en: "{p}{n}",
    },
  },

  onStart: async function ({ api, event, message }) {
    try {
      const groupList = await api.getThreadList(100, null, ['INBOX']);
      const filteredList = groupList.filter(group => group.isGroup);

      if (filteredList.length === 0) {
        return message.reply('No group chats found.');
      }

      let msg = "Which groups do you want to remove the bot from? Reply with the numbers (space-separated):\n\n";
      filteredList.forEach((group, index) => {
        msg += `${index + 1}. ${group.name}\n`;
      });

      const info = await message.reply(msg);

      global.GoatBot.onReply.set(info.messageID, {
        commandName: this.config.name,
        messageID: info.messageID,
        author: event.senderID,
        groupList: filteredList
      });

    } catch (error) {
      console.error("Error listing group chats", error);
      message.reply('An error occurred while listing group chats. Please try again later.');
    }
  },

  onReply: async function({ api, event, Reply, message }) {
    const { author, groupList } = Reply;
    if (event.senderID !== author) return;

    const { body } = event;
    const selectedIndexes = body.split(/\s+/).map(num => parseInt(num.trim()) - 1).filter(num => !isNaN(num) && num >= 0 && num < groupList.length);

    if (selectedIndexes.length === 0) {
      return message.reply("Invalid selection. Please provide valid group numbers.");
    }

    let leftCount = 0;
    for (const index of selectedIndexes) {
      const group = groupList[index];
      try {
        await api.removeUserFromGroup(api.getCurrentUserID(), group.threadID);
        leftCount++;
      } catch (error) {
        console.error(`Error leaving group ${group.name}:`, error);
      }
    }

    api.editMessage(`Left ${leftCount} group(s) successfully.`, event.messageReply.messageID);
  }
};