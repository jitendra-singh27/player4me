import axios from "axios";
import { API_KEY, BASE_URL } from "../config.js";

const getHeaders = () => ({
    "api-token": API_KEY,
    "Content-Type": "application/json"
});

// 📤 Upload
export const uploadFromUrl = async (url) => {
    try {
        const response = await axios.post(
            `${BASE_URL}/video/advance-upload`,
            { url: url.trim() },
            { headers: getHeaders() }
        );
        return response.data;
    } catch (error) {
        console.error("Upload Error:", error.response?.data || error.message);
        throw error;
    }
};

// ⏳ Status
export const getUploadStatus = async (id) => {
    const res = await axios.get(
        `${BASE_URL}/video/advance-upload/${id}`,
        { headers: getHeaders() }
    );
    return res.data;
};

// 🎬 All Videos
// 🎬 All Videos
export const getAllVideos = async () => {
    const res = await axios.get(
        `${BASE_URL}/video/manage`,
        { headers: getHeaders() }
    );
    return res.data;
};

// 🎬 Single Video
export const getVideo = async (id) => {
    const res = await axios.get(
        `${BASE_URL}/video/manage/${id}`,
        { headers: getHeaders() }
    );
    return res.data;
};

// 🗑️ Delete
export const deleteVideo = async (id) => {
    const res = await axios.delete(
        `${BASE_URL}/video/manage/${id}`,
        { headers: getHeaders() }
    );
    return res.data;
};

export const renameVideo = async (id, name) => {
    try {
        const response = await axios.patch(
            `${BASE_URL}/video/manage/${id}`,
            { name },
            {
                headers: {
                    "api-token": API_KEY,
                    "Content-Type": "application/json"
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error("Rename Error:", error.response?.data || error.message);
        throw error;
    }
};
