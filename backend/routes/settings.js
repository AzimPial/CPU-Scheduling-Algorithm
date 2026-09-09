import { Router } from "express";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json({ settings: user.settings });
  } catch (err) {
    console.error("Get settings error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.settings = { ...user.settings, ...req.body };
    await user.save();

    return res.status(200).json({ settings: user.settings });
  } catch (err) {
    console.error("Update settings error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
