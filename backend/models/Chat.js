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

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, default: "" },
    summary: { type: String, default: "" },
    algorithm: { type: String },
    options: { type: Object, default: {} },
    processes: { type: [processSchema], default: [] },
    mode: { type: String },
    selectedAlgorithms: { type: mongoose.Schema.Types.Mixed },
    result: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema({
  owner: {
    type: String,
    required: true,
    index: true,
  },
  clientChatId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: "New chat",
  },
  messages: {
    type: [messageSchema],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

chatSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
