const axios = require('axios');
const fs = require('fs');
const path = require('path');

const models = {
    realistic: "realistic_vision_v51",
    anime: "anythingv5",
    portrait: "portraitplus_v1.0",
    nreal: "nrealfixer",
    meina: "meinamix_v11",
    openjourney: "openjourney_v4",
    remake: "deliberate_v3",
    analog: "analog",
    creative: "creativev1",
    dreams: "dreamshaper_8",
    clarity: "clarity",
    manga: "manga_diffusion"
};

const aspects = {
    square: "square",
    portrait: "portrait",
    landscape: "landscape"
};

module.exports = {
    config: {
        name: "prodia",
        aliases: ["pro"],
        version: "1.0.0",
        author: "Priyanshi Kaur",
        countDown: 15,
        role: 0,
        shortDescription: "Generate images using Prodia AI",
        longDescription: "Advanced image generation with multiple models and settings",
        category: "ai-image",
        guide: {
            en: `{pn} [prompt] [-m model] [-a aspect] [-s steps] [-c cfg] [-n negative]
Available Models:
- realistic: Realistic Vision v5.1
- anime: Anything v5
- portrait: Portrait Plus v1.0
- nreal: NReal Fixer
- meina: Meinamix v11
- openjourney: OpenJourney v4
- remake: Deliberate v3
- analog: Analog Style
- creative: Creative v1
- dreams: DreamShaper 8
- clarity: Clarity
- manga: Manga Diffusion

Aspects: square, portrait, landscape
Steps: 10-50 (default: 30)
CFG Scale: 1-20 (default: 7)
Example: {pn} a beautiful sunset -m realistic -a landscape -s 40 -c 8`
        }
    },

    onStart: async function ({ api, event, args, message }) {
        const input = args.join(" ");
        
        let model = models.realistic;
        let prompt = input;
        let aspect = "portrait";
        let steps = 30;
        let cfg = 7;
        let negative = "ugly, deformed, malformed, blurry, watermark";

        const modelMatch = input.match(/-m\s+(\w+)/);
        if (modelMatch) {
            const requestedModel = modelMatch[1].toLowerCase();
            if (models[requestedModel]) {
                model = models[requestedModel];
                prompt = prompt.replace(/-m\s+\w+/, "").trim();
            }
        }

        const aspectMatch = input.match(/-a\s+(\w+)/);
        if (aspectMatch) {
            const requestedAspect = aspectMatch[1].toLowerCase();
            if (aspects[requestedAspect]) {
                aspect = requestedAspect;
                prompt = prompt.replace(/-a\s+\w+/, "").trim();
            }
        }

        const stepsMatch = input.match(/-s\s+(\d+)/);
        if (stepsMatch) {
            steps = Math.min(Math.max(parseInt(stepsMatch[1]), 10), 50);
            prompt = prompt.replace(/-s\s+\d+/, "").trim();
        }

        const cfgMatch = input.match(/-c\s+(\d+)/);
        if (cfgMatch) {
            cfg = Math.min(Math.max(parseInt(cfgMatch[1]), 1), 20);
            prompt = prompt.replace(/-c\s+\d+/, "").trim();
        }

        const negativeMatch = input.match(/-n\s+"([^"]+)"/);
        if (negativeMatch) {
            negative = negativeMatch[1];
            prompt = prompt.replace(/-n\s+"[^"]+"/, "").trim();
        }

        if (!prompt) {
            return message.reply("Please provide a prompt for image generation.");
        }

        let dimensions;
        switch (aspect) {
            case "square":
                dimensions = { width: 1024, height: 1024 };
                break;
            case "portrait":
                dimensions = { width: 864, height: 1536 };
                break;
            case "landscape":
                dimensions = { width: 1536, height: 864 };
                break;
            default:
                dimensions = { width: 1024, height: 1024 };
        }

        message.reply("⌛ Generating your image...");

        try {
            const response = await axios.post('https://api.prodia.com/v1/sd/generate', {
                model: model,
                prompt: prompt,
                negative_prompt: negative,
                steps: steps,
                cfg_scale: cfg,
                seed: -1,
                upscale: true,
                sampler: "DPM++ 2M Karras",
                width: dimensions.width,
                height: dimensions.height
            }, {
                headers: {
                    'X-Prodia-Key': '31d2ad0b-1579-4db2-b9a0-12a7ba8e7e6a',
                    'accept': 'application/json',
                    'content-type': 'application/json'
                }
            });

            const jobId = response.data.job;
            let imageUrl;
            
            while (true) {
                const statusCheck = await axios.get(`https://api.prodia.com/v1/job/${jobId}`, {
                    headers: {
                        'X-Prodia-Key': '31d2ad0b-1579-4db2-b9a0-12a7ba8e7e6a'
                    }
                });

                if (statusCheck.data.status === "succeeded") {
                    imageUrl = statusCheck.data.imageUrl;
                    break;
                } else if (statusCheck.data.status === "failed") {
                    throw new Error("Image generation failed");
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const tempPath = path.join(__dirname, `temp_${Date.now()}.png`);
            
            fs.writeFileSync(tempPath, imageResponse.data);

            await message.reply({
                body: `✨ Generated using ${model}\nPrompt: ${prompt}`,
                attachment: fs.createReadStream(tempPath)
            });

            fs.unlinkSync(tempPath);

        } catch (error) {
            message.reply(`❌ Generation failed: ${error.message}`);
        }
    }
};