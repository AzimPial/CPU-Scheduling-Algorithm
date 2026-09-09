import { Router } from "express";
import Scenario from "../models/Scenario.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const scenarios = await Scenario.find({ owner: req.user.username }).sort({
      createdAt: -1,
    });
    return res.status(200).json(scenarios);
  } catch (err) {
    console.error("Get scenarios error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, algorithm, options, processes } = req.body;

    if (!name || !algorithm) {
      return res.status(400).json({ error: "Name and algorithm are required" });
    }

    const scenario = new Scenario({
      owner: req.user.username,
      name,
      algorithm,
      options: options || {},
      processes: processes || [],
    });

    await scenario.save();
    return res.status(201).json(scenario);
  } catch (err) {
    console.error("Create scenario error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const scenario = await Scenario.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.username,
    });

    if (!scenario) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.status(200).json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete scenario error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
