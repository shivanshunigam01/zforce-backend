import { Router } from "express";
import { authJwt } from "../middleware/authJwt";
import { buildSignedUploadParams } from "../services/cloudinary.service";

const router = Router();

router.post("/cloudinary/signature", authJwt(["dealer", "distributor", "super_admin", "ho_staff"]), async (req, res, next) => {
  try {
    const folderPart = req.user?.dealerId || req.user?.tenantId || "admin";
    const purpose = req.body.folder || "general";
    res.json({ data: buildSignedUploadParams(`zforce/${folderPart}/${purpose}`) });
  } catch (e) { next(e); }
});

router.post("/assets", authJwt(["dealer", "distributor", "super_admin", "ho_staff"]), async (req, res) => {
  res.status(201).json({ data: req.body });
});

export default router;
