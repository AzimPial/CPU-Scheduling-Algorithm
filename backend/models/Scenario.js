import mongoose from "mongoose";

const processSchema = new mongoose.Schema(
  {
    id: { type: String },
    arrivalTime: { type: Number },
    burstTime: { type: Number },
    priority: { type: Number },
    deadline: { type: Number },
    period: { type: Number },
    wcet: { type: Number },
    tickets: { type: Number },
    weight: { type: Number },
    nice: { type: Number },
    share: { type: Number },
    queue: { type: Number },
    color: { type: String },
  },
  { _id: false }
);

const scenarioSchema = new mongoose.Schema({
  owner: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  algorithm: {
    type: String,
    required: true,
  },
  options: {
    type: Object,
    default: {},
  },
  processes: {
    type: [processSchema],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Scenario = mongoose.model("Scenario", scenarioSchema);

export default Scenario;
