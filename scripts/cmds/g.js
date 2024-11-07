const { google } = require("googleapis");
const fetch = require("node-fetch");
const stream = require("stream");
const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { promisify } = require('util');
const mime = require('mime-types');

const API_KEY = "AIzaSyByR6RPixARKwvjQF8CHXgTy6_4J60oXn4";
const model = "gemini-1.5-pro-latest";
const GENAI_DISCOVERY_URL = `https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta&key=${API_KEY}`;

let mediaProcessingQueue = new Map();
let totalTimeInSeconds;
let wordCount;

const MediaProcessor = {
    SUPPORTED_TYPES: {
        IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        VIDEO: ['video/mp4', 'video/quicktime', 'video/webm'],
        AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg']
    },

    async extractFramesFromVideo(videoPath, outputDir) {
        const frameCount = 5;
        const frames = [];
        
        await promisify(ffmpeg.ffprobe)(videoPath);
        
        for (let i = 0; i < frameCount; i++) {
            const outputPath = path.join(outputDir, `frame_${i}.jpg`);
            await new Promise((resolve, reject) => {
                ffmpeg(videoPath)
                    .screenshots({
                        timestamps: [(i + 1) * 20],
                        filename: `frame_${i}.jpg`,
                        folder: outputDir
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });
            frames.push(outputPath);
        }
        return frames;
    },

    async processMedia(mediaPath) {
        const mimeType = mime.lookup(mediaPath);
        const mediaType = Object.entries(this.SUPPORTED_TYPES)
            .find(([_, types]) => types.includes(mimeType))?.[0];

        if (!mediaType) throw new Error("Unsupported media type");

        switch (mediaType) {
            case 'IMAGE':
                return await this.processImage(mediaPath);
            case 'VIDEO':
                return await this.processVideo(mediaPath);
            default:
                throw new Error(`Processing for ${mediaType} not implemented`);
        }
    },

    async processImage(imagePath) {
        const imageBuffer = await fs.promises.readFile(imagePath);
        return Buffer.from(imageBuffer).toString('base64');
    },

    async processVideo(videoPath) {
        const tempDir = path.join(__dirname, 'temp', Date.now().toString());
        await fs.promises.mkdir(tempDir, { recursive: true });
        const frames = await this.extractFramesFromVideo(videoPath, tempDir);
        
        const processedFrames = await Promise.all(
            frames.map(frame => this.processImage(frame))
        );

        await fs.promises.rm(tempDir, { recursive: true });
        return processedFrames;
    }
};

const ChatManager = {
    getHistoryPath(uid) {
        return path.join(__dirname, 'data', `${uid}_chat_history.json`);
    },

    async loadHistory(uid) {
        const historyPath = this.getHistoryPath(uid);
        try {
            if (fs.existsSync(historyPath)) {
                const data = await fs.promises.readFile(historyPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error(`Error loading chat history: ${error}`);
        }
        return [];
    },

    async saveHistory(uid, history) {
        const historyPath = this.getHistoryPath(uid);
        const dirPath = path.dirname(historyPath);
        
        await fs.promises.mkdir(dirPath, { recursive: true });
        await fs.promises.writeFile(historyPath, JSON.stringify(history, null, 2));
    },

    async clearHistory(uid) {
        const historyPath = this.getHistoryPath(uid);
        if (fs.existsSync(historyPath)) {
            await fs.promises.unlink(historyPath);
        }
    }
};

async function uploadMediaToGemini(genaiService, auth, mediaData) {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(Buffer.from(mediaData, 'base64'));
    
    const media = {
        mimeType: 'image/jpeg',
        body: bufferStream
    };
    
    const response = await genaiService.media.upload({
        media,
        auth,
        requestBody: { file: { displayName: 'Uploaded Media' } }
    });
    
    return { file_uri: response.data.file.uri, mime_type: response.data.file.mimeType };
}

async function generateResponse(uid, prompt, mediaFiles = []) {
    const startTime = Date.now();
    const genaiService = await google.discoverAPI({ url: GENAI_DISCOVERY_URL });
    const auth = new google.auth.GoogleAuth().fromAPIKey(API_KEY);
    
    const history = await ChatManager.loadHistory(uid);
    const conversationContext = history
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
    
    const fullPrompt = `${conversationContext}\n\nUser: ${prompt}`;
    
    const mediaDataParts = [];
    if (mediaFiles.length > 0) {
        for (const file of mediaFiles) {
            const processedData = await MediaProcessor.processMedia(file);
            if (Array.isArray(processedData)) {
                for (const frame of processedData) {
                    const fileData = await uploadMediaToGemini(genaiService, auth, frame);
                    mediaDataParts.push(fileData);
                }
            } else {
                const fileData = await uploadMediaToGemini(genaiService, auth, processedData);
                mediaDataParts.push(fileData);
            }
        }
    }

    const contents = {
        contents: [{
            role: 'user',
            parts: [
                { text: fullPrompt },
                ...mediaDataParts.map(data => ({ file_data: data }))
            ]
        }],
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
        ],
        generation_config: {
            maxOutputTokens: 8192,
            temperature: 0.7,
            topP: 0.8,
            topK: 40
        }
    };

    const response = await genaiService.models.generateContent({
        model: `models/${model}`,
        requestBody: contents,
        auth: auth
    });

    const generatedText = response.data.candidates[0].content.parts[0].text;
    
    history.push({ role: 'user', content: prompt });
    history.push({ role: 'assistant', content: generatedText });
    await ChatManager.saveHistory(uid, history);

    totalTimeInSeconds = (Date.now() - startTime) / 1000;
    wordCount = generatedText.split(/\s+/).length;

    return generatedText;
}

module.exports = {
    config: {
        name: "g",
        version: "2.0",
        author: "Shikaki || Priyanshi Kaur",
        countDown: 5,
        role: 0,
        shortDescription: "Advanced Gemini AI with media support",
        longDescription: "Interact with Gemini Pro model with support for images, videos, and contextual conversation",
        category: "ai",
        guide: {
            en: `
                {pn} <prompt> - Basic text query
                {pn} clear - Clear chat history
                Reply to media with {pn} <prompt> - Analyze media content
                {pn} help - Show detailed command usage
            `.trim()
        }
    },

    onStart: async function ({ api, message, event, args }) {
        const uid = event.senderID;
        const prompt = args.join(" ");

        if (!prompt) {
            return message.reply("Please provide a prompt or query.");
        }

        if (prompt.toLowerCase() === "clear") {
            await ChatManager.clearHistory(uid);
            return message.reply("Chat history cleared successfully.");
        }

        if (prompt.toLowerCase() === "help") {
            return message.reply(`
Advanced Gemini AI Command Usage:
1. Basic query: g <your question>
2. Image analysis: Reply to an image with g <your question>
3. Video analysis: Reply to a video with g <your question>
4. Clear history: g clear
5. Multiple media: Reply to multiple images/videos
            `.trim());
        }

        const processingMessage = await message.reply({
            body: "🤖 Initializing Gemini...",
            attachment: null
        });

        try {
            let mediaFiles = [];
            
            if (event.type === "message_reply" && event.messageReply.attachments?.length > 0) {
                await api.editMessage(
                    `🤖 Processing media files (0/${event.messageReply.attachments.length})...`,
                    processingMessage.messageID
                );

                const attachments = event.messageReply.attachments;
                
                for (let i = 0; i < attachments.length; i++) {
                    const attachment = attachments[i];
                    const tempPath = path.join(__dirname, 'temp', `${Date.now()}_${attachment.filename}`);
                    
                    await downloadFile(attachment.url, tempPath);
                    mediaFiles.push(tempPath);

                    await api.editMessage(
                        `🤖 Processing media files (${i + 1}/${attachments.length})...`,
                        processingMessage.messageID
                    );
                }
            }

            await api.editMessage(
                "🤖 Generating response with Gemini...",
                processingMessage.messageID
            );

            const response = await generateResponse(uid, prompt, mediaFiles);
            const replyMessage = `${response}\n\n⏱️ Time: ${totalTimeInSeconds.toFixed(2)}s | 📝 Words: ${wordCount}`;
            await api.editMessage(replyMessage, processingMessage.messageID);

            mediaFiles.forEach(file => {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            });

        } catch (error) {
            await api.editMessage(
                `❌ Error: ${error.message}`,
                processingMessage.messageID
            );
        }
    }
};

async function downloadFile(url, path) {
    const response = await fetch(url);
    const buffer = await response.buffer();
    await fs.promises.writeFile(path, buffer);
    return path;
}

async function processMediaWithProgress(mediaFiles, updateCallback) {
    const results = [];
    for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        await updateCallback(i + 1, mediaFiles.length);
        const processed = await MediaProcessor.processMedia(file);
        results.push(processed);
    }
    return results;
}

function formatStatusMessage(status, current, total, additionalInfo = "") {
    const progressBar = total ? ` (${current}/${total})` : "";
    return `🤖 ${status}${progressBar}${additionalInfo ? "\n" + additionalInfo : ""}`;
}