import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
    videoId: String,
    title: String,
    status: String,
    streamUrl: String,
    views: Number,
    downloads: Number,
    createdAt: { type: Date, default: Date.now },

});


export default mongoose.model("Video", videoSchema);
