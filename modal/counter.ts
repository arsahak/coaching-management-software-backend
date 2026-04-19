import mongoose, { Schema } from "mongoose";

export interface ICounter {
  _id: string; // e.g., "admission-2025-01-15"
  seq: number;
  date: string; // YYYY-MM-DD format
  createdAt: Date;
  updatedAt: Date;
}

const counterSchema = new Schema<ICounter>(
  {
    _id: {
      type: String,
      required: true,
    },
    seq: {
      type: Number,
      required: true,
      default: 0,
    },
    date: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient cleanup of old counters
counterSchema.index({ date: 1 });

const Counter = mongoose.model<ICounter>("Counter", counterSchema);

/**
 * Gets the next sequence number for a given date
 * Thread-safe using MongoDB's atomic findOneAndUpdate
 */
export const getNextSequence = async (
  type: string,
  date: string
): Promise<number> => {
  const counterId = `${type}-${date}`;

  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 }, $set: { date } },
    { upsert: true, new: true }
  );

  return counter.seq;
};

/**
 * Resets sequence for a given date (admin function)
 */
export const resetSequence = async (
  type: string,
  date: string
): Promise<void> => {
  const counterId = `${type}-${date}`;
  await Counter.findByIdAndUpdate(
    counterId,
    { seq: 0, date },
    { upsert: true }
  );
};

/**
 * Cleanup old counters (can be run periodically)
 * Keeps counters for the last 90 days
 */
export const cleanupOldCounters = async (): Promise<number> => {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const dateString = ninetyDaysAgo.toISOString().split("T")[0];

  const result = await Counter.deleteMany({ date: { $lt: dateString } });
  return result.deletedCount;
};

export default Counter;
