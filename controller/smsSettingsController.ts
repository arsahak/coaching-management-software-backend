import { Request, Response } from "express";
import SMSSetting, {
  DEFAULT_TEMPLATES,
  SMSSettingKey,
} from "../modal/smsSettings";

const ALL_KEYS: SMSSettingKey[] = [
  "admission",
  "attendancePresent",
  "attendanceAbsent",
  "examScheduled",
  "examResult",
  "examAlert",
  "feePaid",
  "feeReminder",
  "feeOverdue",
];

/** Ensure all keys exist in DB (called on first GET) */
async function seedDefaults() {
  for (const key of ALL_KEYS) {
    const exists = await SMSSetting.findOne({ key });
    if (!exists) {
      await SMSSetting.create({
        key,
        enabled: false,
        message: DEFAULT_TEMPLATES[key],
      });
    }
  }
}

/** GET /api/sms-settings — return all settings */
export const getAllSettings = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    await seedDefaults();
    const settings = await SMSSetting.find({}, "-__v").lean();
    // Return as a keyed object for easy frontend consumption
    const map: Record<string, any> = {};
    settings.forEach((s) => { map[s.key] = s; });
    res.json({ success: true, data: map });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load SMS settings" });
  }
};

/** PUT /api/sms-settings — upsert multiple settings at once
 *  Body: { settings: { admission: { enabled, message }, ... } }
 */
export const updateSettings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { settings } = req.body as {
      settings: Partial<Record<SMSSettingKey, { enabled: boolean; message: string }>>;
    };

    if (!settings || typeof settings !== "object") {
      res.status(400).json({ success: false, message: "settings object required" });
      return;
    }

    const ops = Object.entries(settings).map(([key, val]) =>
      SMSSetting.findOneAndUpdate(
        { key },
        { $set: { enabled: val!.enabled, message: val!.message } },
        { upsert: true, new: true }
      )
    );
    await Promise.all(ops);

    res.json({ success: true, message: "Settings saved successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to save SMS settings" });
  }
};

/** PATCH /api/sms-settings/:key — update a single key */
export const updateOneSetting = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { key } = req.params as { key: SMSSettingKey };
    const { enabled, message } = req.body;

    if (!ALL_KEYS.includes(key)) {
      res.status(400).json({ success: false, message: "Invalid setting key" });
      return;
    }

    const updated = await SMSSetting.findOneAndUpdate(
      { key },
      { $set: { enabled, message } },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update setting" });
  }
};
