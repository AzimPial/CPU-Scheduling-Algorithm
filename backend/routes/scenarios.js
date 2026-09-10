import { Router } from "express";
import Chat from "../models/Chat.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const chats = await Chat.find({ owner: req.user.username })
      .sort({ updatedAt: -1 })
      .lean();
    return res.status(200).json(chats);
  } catch (err) {
    console.error("Get chats error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { clientChatId, title, messages } = req.body;

    if (!clientChatId) {
      return res.status(400).json({ error: "clientChatId is required" });
    }

    const chat = await Chat.findOneAndUpdate(
      { owner: req.user.username, clientChatId },
      { title: title || "New chat", messages: messages || [], updatedAt: new Date() },
      { new: true, upsert: true }
    );

    return res.status(200).json(chat);
  } catch (err) {
    console.error("Save chat error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:clientChatId", async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({
      owner: req.user.username,
      clientChatId: req.params.clientChatId,
    });

    if (!chat) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.status(200).json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete chat error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
