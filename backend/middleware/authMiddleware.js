import jwt from "jsonwebtoken";
import User from "../models/User.js";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const user = await User.findOne({ username: decoded.username });
    if (!user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = { username: decoded.username };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

export default authMiddleware;
