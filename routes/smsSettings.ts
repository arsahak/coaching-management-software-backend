import { Router } from "express";
import {
  getAllSettings,
  updateOneSetting,
  updateSettings,
} from "../controller/smsSettingsController";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/",        getAllSettings);
router.put("/",        updateSettings);
router.patch("/:key",  updateOneSetting);

export default router;
