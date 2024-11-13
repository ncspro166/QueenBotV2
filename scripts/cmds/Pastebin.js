const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const PASTEBIN_API_KEY = 'YOUR_PASTEBIN_KEY'; // Get Key From Pastebin Developer Site
const PASTEBIN_API_URL = 'https://pastebin.com/api/api_post.php';
const MOCKY_API_URL = 'https://api.mocky.io/api/mock';
const MOCKY_SECRET = 'Y6PFNNYJO2DCCF4EOmTeB7C7LuWCX0SaIx52';

async function createPastebinPaste(text, title = '', expiration = '1W', privacy = '0') {
    try {
        const formData = new FormData();
        formData.append('api_dev_key', PASTEBIN_API_KEY);
        formData.append('api_option', 'paste');
        formData.append('api_paste_code', text);
        formData.append('api_paste_private', privacy);
        formData.append('api_paste_name', title);
        formData.append('api_paste_expire_date', expiration);

        const response = await axios.post(PASTEBIN_API_URL, formData, {
            headers: formData.getHeaders()
        });

        return {
            url: response.data,
            raw: response.data.replace('pastebin.com', 'pastebin.com/raw')
        };
    } catch (error) {
        throw new Error(`Pastebin Error: ${error.message}`);
    }
}

async function createMockyPaste(content) {
    try {
        const response = await axios.post(MOCKY_API_URL, {
            status: 200,
            content,
            content_type: 'application/json',
            charset: 'UTF-8',
            secret: MOCKY_SECRET,
            expiration: "1year"
        });
        return {
            url: response.data.link,
            raw: `${response.data.link}/raw`
        };
    } catch (error) {
        throw new Error(`Mocky Error: ${error.message}`);
    }
}

function parseArgs(args) {
    const options = {
        title: 'Untitled Paste',
        expiration: '1W',
        privacy: '0',
        service: 'pastebin',
        content: '',
        fileName: '',
    };

    const validExpirations = ['N', '10M', '1H', '1D', '1W', '2W', '1M', '6M', '1Y'];
    const validPrivacy = ['0', '1', '2'];
    const validServices = ['pastebin', 'mocky'];

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('-t:')) {
            options.title = arg.substring(3);
        } else if (arg.startsWith('-e:') && validExpirations.includes(arg.substring(3))) {
            options.expiration = arg.substring(3);
        } else if (arg.startsWith('-p:') && validPrivacy.includes(arg.substring(3))) {
            options.privacy = arg.substring(3);
        } else if (arg.startsWith('-s:') && validServices.includes(arg.substring(3))) {
            options.service = arg.substring(3);
        } else if (arg.startsWith('-f:')) {
            options.fileName = arg.substring(3);
        } else {
            options.content += arg + ' ';
        }
    }

    options.content = options.content.trim();
    return options;
}

module.exports = {
    config: {
        name: "paste",
        aliases: ["pastebin", "mocky", "bin"],
        version: "2.0.0",
        author: "Priyanshi Kaur",
        countDown: 5,
        role: 0,
        shortDescription: "Create pastes on various services",
        longDescription: "Upload text or code to Pastebin or Mocky with various options",
        category: "utility",
        guide: {
            en: `
                Usage: 
                1. Direct text: {p}paste [options] <content>
                2. Reply to message: {p}paste [options]
                3. Upload command: {p}paste -f:commandName

                Options:
                -t:<title> : Set paste title
                -e:<expiration> : Set expiration (N, 10M, 1H, 1D, 1W, 2W, 1M, 6M, 1Y)
                -p:<privacy> : Set privacy (0=public, 1=unlisted, 2=private)
                -s:<service> : Select service (pastebin, mocky)
                -f:<filename> : Upload command file

                Examples:
                {p}paste -t:MyCode -e:1D Some code here
                {p}paste -s:mocky -f:help
                Reply with: {p}paste -t:SavedText`
        }
    },

    onStart: async function ({ api, event, args, message }) {
        try {
            const options = parseArgs(args);
            let textToPaste = '';
            let processingMessage = null;
            processingMessage = await message.reply("📤 Processing your request...");

            if (options.fileName) {
                const filePath = __dirname + `/${options.fileName}.js`;
                if (!fs.existsSync(filePath)) {
                    throw new Error(`File not found: ${options.fileName}.js`);
                }
                textToPaste = fs.readFileSync(filePath, 'utf8');
                options.title = options.title === 'Untitled Paste' ? `Command: ${options.fileName}` : options.title;
            } else if (event.type === "message_reply") {
                textToPaste = event.messageReply.body;
                if (event.messageReply.attachments?.length > 0) {
                    const attachmentInfo = event.messageReply.attachments.map(att => 
                        `[Attachment: ${att.type}${att.url ? ` - ${att.url}` : ''}]`
                    ).join('\n');
                    textToPaste += '\n\nAttachments:\n' + attachmentInfo;
                }
                options.title = options.title === 'Untitled Paste' ? 'Saved Reply' : options.title;
            } else if (options.content) {
                textToPaste = options.content;
            } else {
                throw new Error("Please provide content to paste, reply to a message, or specify a command file.");
            }

            let pasteResult;
            if (options.service === 'mocky') {
                pasteResult = await createMockyPaste(textToPaste);
            } else {
                pasteResult = await createPastebinPaste(
                    textToPaste,
                    options.title,
                    options.expiration,
                    options.privacy
                );
            }

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

            const successMessage = `
📋 Paste created successfully!

🔗 URL: ${pasteResult.url}
📝 Raw URL: ${pasteResult.raw}
📑 Title: ${options.title}
🔧 Service: ${options.service}
${options.service === 'pastebin' ? `
⏳ Expires: ${expirationMap[options.expiration]}
🔒 Privacy: ${options.privacy === '0' ? 'Public' : options.privacy === '1' ? 'Unlisted' : 'Private'}` : ''}
`;

            if (processingMessage) {
                api.editMessage(successMessage, processingMessage.messageID);
            }

            api.setMessageReaction("✅", event.messageID, (err) => {}, true);

        } catch (error) {
            const errorMessage = `❌ Error: ${error.message}`;
            if (processingMessage) {
                api.editMessage(errorMessage, processingMessage.messageID);
            } else {
                message.reply(errorMessage);
            }
            api.setMessageReaction("❌", event.messageID, (err) => {}, true);
        }
    }
};