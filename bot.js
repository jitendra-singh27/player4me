import express from "express";
const app = express();
const PORT = process.env.PORT || 3000;
import mongoose from "mongoose";

import TelegramBot from "node-telegram-bot-api";
import { BOT_TOKEN } from "./config.js";
import { connectDB } from "./db.js";
import Video from "./models/Video.js";


import {
    uploadFromUrl,
    getUploadStatus,
    getVideo,
    getAllVideos,
    deleteVideo,
    renameVideo
} from "./services/player4me.js";


const bot = new TelegramBot(BOT_TOKEN, { polling: true });

connectDB();



app.get("/debug/collections", async (req, res) => {
    try {
        if (!mongoose.connection.db) {
            return res.status(500).json({ error: "DB not connected yet" });
        }

        const collections = await mongoose.connection.db.listCollections().toArray();

        res.json(collections.map(c => c.name));

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// START
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `
🎬 Player 4 Me Video Uploader Commands:

/upload <url>
/status < taskId >
/videos
/link <videoId>
/delete <videoId>
/rename abc123 Avengers Endgame
/search <name>
    `);
});


// 📤 Upload Movie
bot.onText(/\/upload (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const url = match[1].trim().replace(/^\/upload\s*/, "");

    bot.sendMessage(chatId, "🚀 Upload started...");

    try {
        const data = await uploadFromUrl(url);
        const taskId = data.id;

        bot.sendMessage(chatId, `⏳ Processing...\nTask ID: ${taskId}`);

        // 🔁 Polling every 5 sec
      const interval = setInterval(async () => {
    try {
        const statusData = await getUploadStatus(taskId);

        console.log("STATUS:", statusData);

        if (statusData?.status === "completed") {
            clearInterval(interval);

            const videoId = statusData?.video?.id;

            if (!videoId) {
                return bot.sendMessage(chatId, "❌ Video ID not found");
            }

            await Video.create({
                videoId,
                title: url.split("/").pop(),
                status: "completed"
            });

            const link = `https://roninmovies.4meplayer.online/#${videoId}`;
            const download = `${link}&dl=1`;

            return bot.sendMessage(chatId, `
✅ Upload Completed!

🎬 Watch: ${link}
⬇️ Download: ${download}
            `);
        }

        if (statusData?.status === "failed") {
            clearInterval(interval);
            return bot.sendMessage(chatId, "❌ Upload failed");
        }

    } catch (err) {
        console.log("Polling error:", err.message);

        // ✅ keep retrying
    }
}, 5000);

// ⏳ Check Status
bot.onText(/\/status (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const id = match[1];

    try {
        const data = await getUploadStatus(id);

        bot.sendMessage(chatId, `
            📊 Status:
            ID: ${id}
            Status: ${data.status}
        `);
    } catch {
        bot.sendMessage(chatId, "❌ Error fetching status");
    }
});


// 🎬 List Videos
const PER_PAGE = 5;

const sendVideoPage = async (chatId, page = 1) => {
    const videos = await getAllVideos();

    if (!videos.data || videos.data.length === 0) {
        return bot.sendMessage(chatId, "No videos found");
    }

    const total = videos.data.length;
    const totalPages = Math.ceil(total / PER_PAGE);

    const start = (page - 1) * PER_PAGE;
    const pageData = videos.data.slice(start, start + PER_PAGE);

    let text = `🎥 Videos (Page ${page}/${totalPages}):\n\n`;

    pageData.forEach((v) => {
        text += `🎬 ${v.name}
▶️ https://roninmovies.4meplayer.online/#${v.id}
⬇️ https://roninmovies.4meplayer.online/#${v.id}&dl=1

`;
    });

    // 🔘 Buttons
    const buttons = [];

    if (page > 1) {
        buttons.push({ text: "⬅️ Prev", callback_data: `videos_${page - 1}` });
    }

    if (page < totalPages) {
        buttons.push({ text: "➡️ Next", callback_data: `videos_${page + 1}` });
    }

    return bot.sendMessage(chatId, text, {
        reply_markup: {
            inline_keyboard: [buttons]
        }
    });
};

bot.onText(/\/videos/, async (msg) => {
    sendVideoPage(msg.chat.id, 1);
});


bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith("videos_")) {
        const page = parseInt(data.split("_")[1]);

        try {
            // Remove old message
            await bot.deleteMessage(chatId, query.message.message_id);

            // Send new page
            await sendVideoPage(chatId, page);

        } catch (err) {
            console.error(err);
        }
    }

    bot.answerCallbackQuery(query.id);
});



// bot.onText(/\/videos/, async (msg) => {
//     const chatId = msg.chat.id;

//     try {
//         const videos = await getAllVideos();

//         if (!videos.data || videos.data.length === 0) {
//             return bot.sendMessage(chatId, "No videos found");
//         }

//         let text = "🎥 Videos:\n\n";

//         for (const v of videos.data) {
//             const item = `ID: ${v.id}
// Title: ${v.name}
// Status: ${v.status}
// Link: https://roninmovies.4meplayer.online/#${v.id}
// Download: https://roninmovies.4meplayer.online/#${v.id}&dl=1

// `;

//             // 🚀 Send chunk if limit reached
//             if ((text + item).length > 4000) {
//                 await bot.sendMessage(chatId, text);
//                 text = "";
//             }

//             text += item;
//         }

//         // send remaining
//         if (text) {
//             await bot.sendMessage(chatId, text);
//         }

//     } catch (err) {
//         console.error(err);
//         bot.sendMessage(chatId, "❌ Error fetching videos");
//     }
// });

// ▶️ Get Streaming Link
bot.onText(/\/link (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const id = match[1];

    try {
        const video = await getVideo(id);

        const stream = video.playback?.hls || "Not ready";

        bot.sendMessage(chatId, `
            🎬 Stream Link:
            ${stream}
       `);
    } catch {
        bot.sendMessage(chatId, "❌ Error fetching link");
    }
});


// 🗑️ Delete Video
bot.onText(/\/delete (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const id = match[1];

    try {
        await deleteVideo(id);
        bot.sendMessage(chatId, "🗑️ Video deleted");
    } catch {
        bot.sendMessage(chatId, "❌ Delete failed");
    }
});


const sendSearchPage = async (chatId, queryText, page = 1) => {
    const videos = await getAllVideos();

    if (!videos.data || videos.data.length === 0) {
        return bot.sendMessage(chatId, "No videos found");
    }

    // 🔍 Filter videos
    const filtered = videos.data.filter(v =>
        v.name?.toLowerCase().includes(queryText.toLowerCase())
    );

    if (filtered.length === 0) {
        return bot.sendMessage(chatId, `❌ No results for "${queryText}"`);
    }

    const PER_PAGE = 5;
    const total = filtered.length;
    const totalPages = Math.ceil(total / PER_PAGE);

    const start = (page - 1) * PER_PAGE;
    const pageData = filtered.slice(start, start + PER_PAGE);

    let text = `🔍 Results for "${queryText}" (Page ${page}/${totalPages}):\n\n`;

    pageData.forEach((v) => {
        text += `🎬 ${v.name}
▶️ https://roninmovies.4meplayer.online/#${v.id}
⬇️ https://roninmovies.4meplayer.online/#${v.id}&dl=1

`;
    });

    // 🔘 Buttons
    const buttons = [];

    if (page > 1) {
        buttons.push({
            text: "⬅️ Prev",
            callback_data: `search_${queryText}_${page - 1}`
        });
    }

    if (page < totalPages) {
        buttons.push({
            text: "➡️ Next",
            callback_data: `search_${queryText}_${page + 1}`
        });
    }

    return bot.sendMessage(chatId, text, {
        reply_markup: {
            inline_keyboard: [buttons]
        }
    });
};

bot.onText(/\/search (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const queryText = match[1].trim();

    sendSearchPage(chatId, queryText, 1);
});

bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    try {
        await bot.deleteMessage(chatId, query.message.message_id);

        // 🎬 Pagination
        if (data.startsWith("videos_")) {
            const page = parseInt(data.split("_")[1]);
            await sendVideoPage(chatId, page);
        }

        // 🔍 Search Pagination
        if (data.startsWith("search_")) {
            const parts = data.split("_");
            const queryText = parts[1];
            const page = parseInt(parts[2]);

            await sendSearchPage(chatId, queryText, page);
        }

    } catch (err) {
        console.error(err);
    }

    bot.answerCallbackQuery(query.id);
});

bot.onText(/\/rename (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;

    try {
        const args = match[1].split(" ");

        const videoId = args[0];
        const newName = args.slice(1).join(" ");

        if (!videoId || !newName) {
            return bot.sendMessage(chatId, "❌ Usage: /rename <videoId> <new name>");
        }

        await renameVideo(videoId, newName);

        bot.sendMessage(chatId, `✅ Video renamed to:\n${newName}`);

    } catch (err) {
        bot.sendMessage(chatId, "❌ Rename failed");
    }
});

app.listen(PORT, () => {
    console.log("Server running...");
});
