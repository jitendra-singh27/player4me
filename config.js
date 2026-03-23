import dotenv from "dotenv";
dotenv.config()


export const BOT_TOKEN = process.env.BOT_TOKEN;
export const API_KEY = process.env.API_KEY;
export const BASE_URL = "https://player4me.com/api/v1"
export const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL;