const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const config = {
    accountId: "d695895c-7040-441f-abcf-a83b1aa12850",
    apiToken: "etT2U0JHhwoTK7ogH7a8uTLIflDhbLQG",
    baseUrl: "https://api.gofile.io"
};

module.exports = {
    config: {
        name: "gofile",
        version: "1.0.0",
        author: "Priyanshi Kaur",
        countDown: 5,
        role: 0,
        shortDescription: "Manage files using Gofile API",
        longDescription: "Upload, manage and share files using Gofile's cloud storage",
        category: "utility",
        guide: {
            en: `
                {p} upload: Upload a file
                {p} folder create <name>: Create new folder
                {p} search <query>: Search files
                {p} delete <contentId>: Delete file/folder
                {p} move <contentId> <folderId>: Move content
                {p} copy <contentId> <folderId>: Copy content
                {p} info <contentId>: Get content info
                {p} direct <contentId>: Get direct download link
                {p} list: List files in root folder
            `
        }
    },

    onStart: async function ({ api, event, args, message }) {
        const command = args[0]?.toLowerCase();
        const remainingArgs = args.slice(1);

        try {
            let response;
            switch (command) {
                case "upload":
                    if (event.type !== "message_reply" || !event.messageReply.attachments?.length) {
                        return message.reply("Please reply to a message with attachments to upload");
                    }
                    
                    const attachments = event.messageReply.attachments;
                    const uploadMessages = [];
                    
                    for (const attachment of attachments) {
                        const tempPath = path.join(__dirname, `temp_${Date.now()}`);
                        await this.downloadFile(attachment.url, tempPath);
                        
                        const formData = new FormData();
                        formData.append("file", fs.createReadStream(tempPath));
                        
                        const uploadResponse = await this.uploadFile(formData);
                        fs.unlinkSync(tempPath);
                        
                        uploadMessages.push(`✅ File uploaded: ${uploadResponse.downloadPage}`);
                    }
                    
                    return message.reply(uploadMessages.join("\n"));

                case "folder":
                    if (remainingArgs[0] === "create" && remainingArgs[1]) {
                        const folderName = remainingArgs.slice(1).join(" ");
                        response = await this.createFolder(folderName);
                        return message.reply(`✅ Folder created: ${response.name}`);
                    }
                    return message.reply("❌ Invalid folder command. Use: folder create <name>");

                case "search":
                    if (!remainingArgs.length) return message.reply("❌ Please provide a search query");
                    response = await this.searchContent(remainingArgs.join(" "));
                    return message.reply(this.formatSearchResults(response.contents));

                case "delete":
                    if (!remainingArgs[0]) return message.reply("❌ Please provide a contentId to delete");
                    await this.deleteContent(remainingArgs[0]);
                    return message.reply("✅ Content deleted successfully");

                case "move":
                    if (remainingArgs.length < 2) {
                        return message.reply("❌ Please provide both contentId and destination folderId");
                    }
                    await this.moveContent(remainingArgs[0], remainingArgs[1]);
                    return message.reply("✅ Content moved successfully");

                case "copy":
                    if (remainingArgs.length < 2) {
                        return message.reply("❌ Please provide both contentId and destination folderId");
                    }
                    await this.copyContent(remainingArgs[0], remainingArgs[1]);
                    return message.reply("✅ Content copied successfully");

                case "info":
                    if (!remainingArgs[0]) return message.reply("❌ Please provide a contentId");
                    response = await this.getContentInfo(remainingArgs[0]);
                    return message.reply(this.formatContentInfo(response));

                case "direct":
                    if (!remainingArgs[0]) return message.reply("❌ Please provide a contentId");
                    response = await this.getDirectLink(remainingArgs[0]);
                    return message.reply(`📎 Direct download link: ${response.directLink}`);

                case "list":
                    response = await this.listRootContents();
                    return message.reply(this.formatContentsList(response.contents));

                default:
                    return message.reply(this.config.guide.en);
            }
        } catch (error) {
            return message.reply(`❌ Error: ${error.message}`);
        }
    },

    // API Integration Methods
    async uploadFile(formData) {
        const response = await axios.post('https://store1.gofile.io/contents/uploadfile', formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${config.apiToken}`
            }
        });
        return response.data;
    },

    async createFolder(name) {
        const response = await axios.post(`${config.baseUrl}/contents/createFolder`, {
            name,
            parentFolderId: "root"
        }, {
            headers: { 'Authorization': `Bearer ${config.apiToken}` }
        });
        return response.data;
    },

    async searchContent(query) {
        const response = await axios.get(`${config.baseUrl}/contents/search`, {
            params: { query },
            headers: { 'Authorization': `Bearer ${config.apiToken}` }
        });
        return response.data;
    },

    async deleteContent(contentId) {
        await axios.delete(`${config.baseUrl}/contents/${contentId}`, {
            headers: { 'Authorization': `Bearer ${config.apiToken}` }
        });
    },

    async moveContent(contentId, destFolderId) {
        await axios.put(`${config.baseUrl}/contents/${contentId}/update`, {
            folderId: destFolderId
        }, {
            headers: { 'Authorization': `Bearer ${config.apiToken}` }
        });
    },

    async copyContent(contentId, destFolderId) {
        await axios.post(`${config.baseUrl}/contents/copy`, {
            contentId,
            folderId: destFolderId
        }, {
            headers: { 'Authorization': `Bearer ${config.apiToken}` }
        });
    },

    async getContentInfo(contentId) {
        const response = await axios.get(`${config.baseUrl}/contents/${contentId}`, {
            headers: { 'Authorization': `Bearer ${config.apiToken}` }
        });
        return response.data;
    },

    async getDirectLink(contentId) {
        const response = await axios.post(`${config.baseUrl}/contents/${contentId}/directlinks`, {}, {
            headers: { 'Authorization': `Bearer ${config.apiToken}` }
        });
        return response.data;
    },

    async listRootContents() {
        const response = await axios.get(`${config.baseUrl}/contents/root`, {
            headers: { 'Authorization': `Bearer ${config.apiToken}` }
        });
        return response.data;
    },

    // Utility Methods
    async downloadFile(url, path) {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });
        return new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(path);
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    },

    formatSearchResults(contents) {
        if (!contents?.length) return "No results found";
        return contents.map(content => 
            `📄 ${content.name}\n🔗 ID: ${content.id}\n📁 Type: ${content.type}\n`
        ).join("\n");
    },

    formatContentInfo(content) {
        return `
📄 Name: ${content.name}
🆔 ID: ${content.id}
📁 Type: ${content.type}
📅 Created: ${new Date(content.createDate).toLocaleString()}
📦 Size: ${this.formatSize(content.size)}
        `;
    },

    formatContentsList(contents) {
        if (!contents?.length) return "No contents found";
        return contents.map(content => 
            `${content.type === 'folder' ? '📁' : '📄'} ${content.name}`
        ).join("\n");
    },

    formatSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Byte';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }
};