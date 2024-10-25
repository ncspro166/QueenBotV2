const axios = require('axios');
const FormData = require('form-data');

const API_DEV_KEY = 'a5NjYtjOENDQlZur3XCF4-H4vLcxkjeh';
const PASTEBIN_API_URL = 'https://pastebin.com/api/api_post.php';

async function createPaste(text, title = '', expiration = '1W', privacy = '0') {
    try {
        const formData = new FormData();
        formData.append('api_dev_key', API_DEV_KEY);
        formData.append('api_option', 'paste');
        formData.append('api_paste_code', text);
        formData.append('api_paste_private', privacy); // 0=public, 1=unlisted, 2=private
        formData.append('api_paste_name', title);
        formData.append('api_paste_expire_date', expiration);

        const response = await axios.post(PASTEBIN_API_URL, formData, {
            headers: formData.getHeaders()
        });

        if (response.data.startsWith('https://pastebin.com/')) {
            return response.data;
        } else {
            throw new Error(`Pastebin API Error: ${response.data}`);
        }
    } catch (error) {
        throw new Error(`Failed to create paste: ${error.message}`);
    }
}

function parseArgs(args) {
    let title = '';
    let expiration = '1W';
    let privacy = '0';
    let content = '';

    const validExpirations = ['N', '10M', '1H', '1D', '1W', '2W', '1M', '6M', '1Y'];
    const validPrivacy = ['0', '1', '2'];

    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('-t:')) {
            title = args[i].substring(3);
        } else if (args[i].startsWith('-e:') && validExpirations.includes(args[i].substring(3))) {
            expiration = args[i].substring(3);
        } else if (args[i].startsWith('-p:') && validPrivacy.includes(args[i].substring(3))) {
            privacy = args[i].substring(3);
        } else {
            content += args[i] + ' ';
        }
    }

    return {
        title: title || 'Untitled Paste',
        expiration,
        privacy,
        content: content.trim()
    };
}

module.exports = {
    config: {
        name: "pastebin",
        aliases: ["bin", "paste"],
        version: "1.0",
        author: "Priyanshi Kaur",
        countDown: 5,
        role: 0,
        shortDescription: "Create Pastebin paste",
        longDescription: "Create a paste on Pastebin with custom title, expiration, and privacy settings",
        category: "utility",
        guide: {
            en: `
                Usage: {p}pastebin [options] <content>
                Or reply to a message with: {p}pastebin [options]

                Options:
                -t:<title> : Set paste title
                -e:<expiration> : Set expiration (N, 10M, 1H, 1D, 1W, 2W, 1M, 6M, 1Y)
                -p:<privacy> : Set privacy (0=public, 1=unlisted, 2=private)

                Examples:
                {p}pastebin -t:MyCode -e:1D Some code here
                {p}pastebin -p:1 Private content here
                Reply to a message with: {p}pastebin -t:SavedText`
        }
    },

    onStart: async function ({ api, event, args, message }) {
        try {
            let textToPaste = '';
            let options = parseArgs(args);

            // Handle reply case
            if (event.type === "message_reply") {
                textToPaste = event.messageReply.body;
                
                // If there are attachments in the reply
                if (event.messageReply.attachments?.length > 0) {
                    const attachmentInfo = event.messageReply.attachments.map(att => 
                        `[Attachment: ${att.type}${att.url ? ` - ${att.url}` : ''}]`
                    ).join('\n');
                    textToPaste += '\n\nAttachments:\n' + attachmentInfo;
                }
                
                // If no specific title was provided for reply
                if (!options.title || options.title === 'Untitled Paste') {
                    options.title = 'Saved Reply';
                }
            } else {
                // Direct command case
                if (!options.content) {
                    return message.reply("⚠️ Please provide content to paste or reply to a message.");
                }
                textToPaste = options.content;
            }

            // Show processing message
            api.setMessageReaction("⌛", event.messageID, (err) => {}, true);
            message.reply("📤 Creating paste...");

            // Create the paste
            const pasteURL = await createPaste(
                textToPaste,
                options.title,
                options.expiration,
                options.privacy
            );

            // Format expiration for display
            const expirationMap = {
                'N': 'Never',
                '10M': '10 Minutes',
                '1H': '1 Hour',
                '1D': '1 Day',
                '1W': '1 Week',
                '2W': '2 Weeks',
                '1M': '1 Month',
                '6M': '6 Months',
                '1Y': '1 Year'
            };

            // Send success message
            const successMessage = `
📋 Paste created successfully!

🔗 URL: ${pasteURL}
📝 Title: ${options.title}
⏳ Expires: ${expirationMap[options.expiration]}
🔒 Privacy: ${options.privacy === '0' ? 'Public' : options.privacy === '1' ? 'Unlisted' : 'Private'}
`;

            message.reply(successMessage);
            api.setMessageReaction("✅", event.messageID, (err) => {}, true);

        } catch (error) {
            message.reply(`❌ Error: ${error.message}`);
            api.setMessageReaction("❌", event.messageID, (err) => {}, true);
        }
    }
};